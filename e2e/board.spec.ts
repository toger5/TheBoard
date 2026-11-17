import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ALICE, BOARD_EVENT, BOB, expect, pathContent, ROOM, test, textContent, textEvents, WIDGET_ID } from "./board";

const here = __dirname;
const NS = "org.matrix.mscXXXX";

test("the board starts as an MSC4412 widget", async ({ board }) => {
    await board.open();

    const sent = await board.actions("fromWidget");
    expect(sent.slice(0, 3)).toEqual([
        "org.matrix.msc4412.request_capabilities",
        `${NS}.get_matrix_context`,
        "org.matrix.msc4412.notify_ready",
    ]);
    const [request] = await board.requests("org.matrix.msc4412.request_capabilities");
    expect(request.capabilities).toEqual(expect.arrayContaining([
        `widget:${NS}.send_event.timeline:${BOARD_EVENT}`,
        `widget:${NS}.read_timeline:${BOARD_EVENT}`,
        `host:${NS}.forward_event.timeline:${BOARD_EVENT}`,
        `widget:${NS}.paginate_timeline`,
    ]));

    const ids = await board.frame().evaluate(() => {
        const backend = (window as any).AppData.instance.matrixBackend;
        return { room: backend.currentRoomId, user: backend.getUserId() };
    });
    expect(ids).toEqual({ room: ROOM, user: ALICE });
    await expect(board.frameLocator().locator("#paper-canvas")).toBeVisible();
    await expect(board.frameLocator().locator("#tool-type-pen")).toBeVisible();
    board.expectNoErrors();
});

test("the whole history is paginated in, redactions included", async ({ board }) => {
    const seeded = textEvents(500);
    let redacted = "";
    await board.open({
        timeline: seeded,
        resolvePagination: { count: 5 }, // older plain messages, which the board does not read
        beforeOpen: async (b) => {
            const events = await b.boardEvents();
            expect(events).toHaveLength(500);
            redacted = events[123].eventId;
            await b.sendEvent({ type: "m.room.redaction", sender: BOB, content: { redacts: redacted } });
        },
    });

    // Several pages: the cursor moves with `from`, and the client is asked for more once.
    const reads = await board.requests(`${NS}.read_timeline`);
    expect(reads.length).toBeGreaterThanOrEqual(4);
    expect(reads[0].from).toBeUndefined();
    expect(reads.slice(1).every((r) => typeof r.from === "string")).toBe(true);
    expect(await board.requests(`${NS}.paginate_timeline`)).toHaveLength(1);

    const objects = await board.objects();
    expect(objects).toHaveLength(499);
    expect(new Set(objects.map((o) => o.id)).size).toBe(499);
    expect(objects.find((o) => o.id === redacted)).toBeUndefined();
    expect(objects.every((o) => o.drawn)).toBe(true);
    expect(await board.drawnIds()).not.toContain(redacted);
    board.expectNoErrors();
});

test("a pen stroke is sent once and its local echo is replaced", async ({ board }) => {
    await board.open();
    await board.selectTool("tool-type-pen");
    await board.drag([[500, 250], [560, 280], [620, 260], [700, 320]]);

    await expect.poll(() => board.boardEvents()).toHaveLength(1);
    const [event] = await board.boardEvents();
    expect(event.sender).toBe(ALICE);
    expect(event.content.objtype).toBe("path");

    await expect.poll(() => board.objects()).toEqual([{ id: event.eventId, sender: ALICE, objtype: "path", drawn: true }]);
    // No local echo is left behind, and the stroke is drawn exactly once.
    await expect.poll(() => board.drawnIds()).toEqual([event.eventId]);
    board.expectNoErrors();
});

test("line and text tools send their objects", async ({ board }) => {
    await board.open();

    await board.selectTool("tool-type-line");
    await board.drag([[300, 200], [500, 300]]);
    await expect.poll(async () => (await board.boardEvents()).map((e) => e.content.objtype)).toEqual(["path"]);

    await board.selectTool("tool-type-text");
    await board.click(400, 400);
    await board.page.keyboard.type("hello board");
    await board.page.keyboard.press("Enter");
    await expect.poll(async () => (await board.boardEvents()).map((e) => e.content.objtype)).toEqual(["path", "text"]);
    const text = (await board.boardEvents())[1];
    expect(text.content.text).toBe("hello board");

    await expect.poll(async () => (await board.objects()).map((o) => o.objtype).sort()).toEqual(["path", "text"]);
    await expect.poll(async () => (await board.drawnIds()).length).toBe(2);
    board.expectNoErrors();
});

test("objects of other users appear live", async ({ board }) => {
    await board.open({ timeline: textEvents(3) });
    await board.sendEvent({ type: BOARD_EVENT, sender: BOB, content: pathContent(100, 100) });

    await expect.poll(async () => (await board.objects()).length).toBe(4);
    const [live] = (await board.boardEvents()).slice(-1);
    await expect.poll(async () => (await board.objects()).find((o) => o.id === live.eventId)).toEqual({
        id: live.eventId, sender: BOB, objtype: "path", drawn: true,
    });
    board.expectNoErrors();
});

test("the eraser redacts own objects only", async ({ board }) => {
    await board.open({
        timeline: [
            // Bob's stroke above Alice's; both cross the eraser's way.
            { type: BOARD_EVENT, sender: ALICE, content: pathContent(0, 0) },
            { type: BOARD_EVENT, sender: BOB, content: pathContent(0, 10) },
        ],
    });
    const [mine, bobs] = await board.boardEvents();
    // Board coordinates map to the canvas through the view: erase across both strokes at x = 50.
    const across = await board.frame().evaluate(() => {
        const view = (window as any).AppData.instance.drawingCanvas.drawLayer.view;
        const top = view.projectToView([50, -20]);
        const bottom = view.projectToView([50, 80]);
        return [[top.x, top.y], [bottom.x, bottom.y]];
    });
    await board.selectTool("tool-type-eraser");
    await board.drag(across as [number, number][]);

    await expect.poll(async () => (await board.timeline()).filter((e) => e.eventType === "m.room.redaction").map((e) => e.content.redacts)).toEqual([mine.eventId]);
    await expect.poll(async () => (await board.objects()).map((o) => o.id)).toEqual([bobs.eventId]);
    expect(await board.drawnIds()).toEqual([bobs.eventId]);
    board.expectNoErrors();
});

test("images are uploaded and shown through the client", async ({ board }) => {
    await board.open();
    const chooser = board.page.waitForEvent("filechooser");
    await board.selectTool("tool-type-image");
    await (await chooser).setFiles({ name: "red.png", mimeType: "image/png", buffer: readFileSync(join(here, "fixtures/red.png")) });

    // Wait for the preview, then press its "create" button (the last item of the preview group).
    const submit = await board.frame().waitForFunction(() => {
        const canvas = (window as any).AppData.instance.drawingCanvas;
        const group = canvas.toolLayer.children.find((c: any) => c.className === "Group" && c.visible);
        const image = group?.firstChild;
        if (!image?.loaded) return null;
        const button = group.lastChild;
        const at = button.view.projectToView(button.position);
        return [at.x, at.y];
    });
    const [x, y] = (await submit.jsonValue()) as [number, number];
    await board.click(x, y);

    await expect.poll(async () => (await board.boardEvents()).map((e) => e.content.objtype)).toEqual(["image"]);
    const [event] = await board.boardEvents();
    expect(event.content.url).toMatch(/^mxc:\/\//);
    expect(await board.actions("fromWidget")).toContain("org.matrix.msc4039.upload_file");

    // The board shows its own upload by downloading it again.
    await expect.poll(() => board.actions("fromWidget")).toContain("org.matrix.msc4039.download_file");
    await expect.poll(() => board.frame().evaluate((id) => {
        const item = (window as any).AppData.instance.drawingCanvas.drawLayer.getItem({ match: (i: any) => i.data.id === id });
        return !!item?.loaded && item.source.startsWith("blob:");
    }, event.eventId)).toBe(true);
    board.expectNoErrors();
});

test("reloading the board shows the same objects", async ({ board }) => {
    await board.open({ timeline: textEvents(30) });
    await board.selectTool("tool-type-pen");
    await board.drag([[500, 250], [600, 300]]);
    await expect.poll(async () => (await board.objects()).length).toBe(31);
    const before = (await board.objects()).map((o) => o.id).sort();

    const oldFrame = board.frame();
    await board.dispatch({ type: "widget/reload", widgetId: WIDGET_ID });
    await expect.poll(() => oldFrame.isDetached()).toBe(true);
    await board.waitForBoard();
    await board.waitForHistory();

    expect((await board.objects()).map((o) => o.id).sort()).toEqual(before);
    expect((await board.drawnIds()).sort()).toEqual(before);
    board.expectNoErrors();
});

test("a failed send removes the local echo", async ({ board }) => {
    await board.open();
    await board.dispatch({ type: "mock/setFailSends", on: true });
    await board.selectTool("tool-type-pen");
    await board.drag([[500, 250], [600, 300]]);

    await expect.poll(() => board.frame().evaluate(() => document.getElementById("loading-span").innerText)).toContain("Could not send");
    await expect.poll(() => board.drawnIds()).toEqual([]);
    expect(await board.boardEvents()).toEqual([]);
    board.expectNoErrors([/Sending failed/, /host rejected the request/]);
});

test("text objects keep their content", async ({ board }) => {
    await board.open({ timeline: [{ type: BOARD_EVENT, sender: BOB, content: textContent("from history", 10, 10) }] });
    const text = await board.frame().evaluate(() => {
        const items = (window as any).AppData.instance.drawingCanvas.drawLayer.getItems({ className: "PointText" });
        return items.map((i: any) => i.content);
    });
    expect(text).toEqual(["from history"]);
    board.expectNoErrors();
});

test("rect and marker tools send their objects", async ({ board }) => {
    await board.open();
    await board.selectTool("tool-type-rect");
    await board.drag([[300, 200], [450, 300]]);
    await board.selectTool("tool-type-marker");
    await board.drag([[500, 250], [600, 300], [650, 260]]);

    await expect.poll(async () => (await board.boardEvents()).map((e) => e.content.objtype)).toEqual(["path", "path"]);
    const [rect] = await board.boardEvents();
    expect(rect.content.paths[0].closed).toBe(true);
    await expect.poll(async () => (await board.drawnIds()).length).toBe(2);
    board.expectNoErrors();
});

test("the top bar buttons work", async ({ board }) => {
    await board.open({ timeline: textEvents(5) });
    await board.selectTool("tool-type-pen");
    await board.drag([[500, 250], [600, 300]]);
    await expect.poll(async () => (await board.objects()).length).toBe(6);
    const [mine] = (await board.boardEvents()).slice(-1);
    expect(mine.sender).toBe(ALICE);

    // "Redact Last" removes the newest own object.
    await board.frameLocator().getByRole("button", { name: "Redact Last" }).click();
    await expect.poll(async () => (await board.timeline()).filter((e) => e.eventType === "m.room.redaction").map((e) => e.content.redacts)).toEqual([mine.eventId]);
    await expect.poll(async () => (await board.objects()).length).toBe(5);

    // "Load History" after the start was reached loads nothing new and draws nothing twice.
    await board.frameLocator().getByRole("button", { name: "Load History" }).click();
    await board.page.waitForTimeout(500);
    expect((await board.drawnIds()).length).toBe(5);

    await board.frameLocator().getByRole("button", { name: "Go Home" }).click();
    await board.frameLocator().getByRole("button", { name: "Reload Canvas" }).click();
    await expect.poll(async () => (await board.drawnIds()).length).toBe(5);
    board.expectNoErrors();
});

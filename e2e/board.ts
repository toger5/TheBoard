/**
 * The fixture of the e2e tests: the board as an MSC4412 widget in the matrix-widget-tools
 * widget-host, in DevBackend mode (in-memory rooms, nothing leaves the page).
 *
 * The host's test API is `window.widgetHost` (packages/widget-host/README.md, "Using it in
 * end-to-end tests", in matrix-widget-tools-sdk): `populate(seed)` resets it to a seed,
 * `dispatch(intent)` does what a button of its dev tools does, `messages(widgetId)` is the wire
 * log and `store(roomId)` the content of a mocked room.
 */
import { expect, test as base, type Frame, type FrameLocator, type Page } from "@playwright/test";

export { expect };

export const HOST_URL = process.env.BOARD_HOST_URL ?? "https://toger5.github.io/matrix-widget-sdk/host/";
export const BOARD_URL = process.env.BOARD_URL ?? "http://localhost:8081/";

export const ROOM = "!board:dev.local";
export const ALICE = "@alice:dev.local";
export const BOB = "@bob:dev.local";
export const BOARD_EVENT = "com.github.TheBoard.object";
export const WIDGET_KEY = "m.widget/board";
export const WIDGET_ID = `${ROOM}|${WIDGET_KEY}`;

export interface SeedEvent {
    type: string;
    sender?: string;
    content: Record<string, unknown>;
}

/** A board text object, as `MatrixBackend.sendText` sends it. */
export function textContent(text: string, x = 0, y = 0) {
    return {
        version: 1,
        objtype: "text",
        text,
        fontSize: 30,
        fontFamily: "sans-serif",
        color: "#000000",
        position: { x: x.toFixed(2), y: y.toFixed(2) },
    };
}

/** A board path object (version 3, one straight stroke), as `MatrixBackend.sendPath` sends it. */
export function pathContent(x = 0, y = 0) {
    return {
        version: 3,
        objtype: "path",
        paths: [{
            segments: ["0.00 0.00 0.00 0.00 0.00 0.00", "100.00 50.00 0.00 0.00 0.00 0.00"],
            closed: false,
            fillColor: null,
            strokeColor: "#000000ff",
            strokeWidth: 3,
            position: { x: x.toFixed(2), y: y.toFixed(2) },
        }],
    };
}

export interface StoreEvent {
    eventId: string;
    eventType: string;
    sender: string;
    content: any;
}

/** What the board holds for an object: the ObjectStore entry and whether a canvas item shows it. */
export interface BoardObject {
    id: string;
    sender: string;
    objtype: string;
    drawn: boolean;
}

export interface OpenOptions {
    timeline?: SeedEvent[];
    /** Called after the room is seeded and before the board starts (to change the room first). */
    beforeOpen?: (board: Board) => Promise<void>;
    /**
     * The DevBackend's back-pagination only ends when its dev tools resolve it. By default the
     * fixture resolves it as "start reached" with no older events, as soon as the board asks.
     */
    resolvePagination?: false | { count: number };
}

export class Board {
    /** Console errors and uncaught exceptions of the host page and the board frame. */
    readonly errors: string[] = [];

    constructor(readonly page: Page) {
        page.on("console", (message) => {
            if (message.type() === "error") this.errors.push(`console.error: ${message.text()}`);
        });
        page.on("pageerror", (error) => this.errors.push(`pageerror: ${error.message}`));
    }

    /** Load the host and wait until its app is up (populating earlier is undone by its start). */
    async start() {
        await this.page.goto(`${HOST_URL}?mode=memory&autoApprove=1`);
        await this.page.waitForFunction(() => (window as any).widgetHost?.state().screen.kind === "main");
        await this.page.waitForTimeout(500);
    }

    /** Seed the room with the board widget and the given events, open the board and wait for its history. */
    async open(options: OpenOptions = {}) {
        const widget = { type: "m.widget", state_key: "board", content: { name: "TheBoard", url: BOARD_URL, uses_widget_api: true } };
        await this.page.evaluate((seed) => (window as any).widgetHost.populate(seed), {
            userId: ALICE,
            rooms: [{
                id: ROOM,
                name: "Board room",
                members: [{ userId: ALICE, displayName: "Alice" }, { userId: BOB, displayName: "Bob" }],
                widgets: [widget],
                timeline: options.timeline ?? [],
            }],
            open: [{ room: ROOM, overview: true }],
            sidePanel: null,
            behavior: { autoApproveCapabilities: true },
        });
        if (options.beforeOpen) await options.beforeOpen(this);
        await this.dispatch({ type: "room/open", roomId: ROOM, widgetKey: WIDGET_KEY });
        await this.waitForBoard();
        if (options.resolvePagination !== false) {
            await this.resolvePagination(options.resolvePagination?.count ?? 0);
            await this.waitForHistory();
        }
    }

    /** The board's iframe, once it runs. */
    frame(): Frame {
        const frame = this.page.frames().find((f) => f.url().startsWith(BOARD_URL));
        if (!frame) throw new Error("The board frame is not loaded");
        return frame;
    }

    frameLocator(): FrameLocator {
        return this.page.frameLocator(`iframe[src^="${BOARD_URL}"]`);
    }

    async waitForBoard() {
        await expect.poll(() => this.page.frames().some((f) => f.url().startsWith(BOARD_URL)), { timeout: 20_000 }).toBe(true);
        await expect.poll(() => this.frame().evaluate(() => document.body.dataset.history !== undefined).catch(() => false), { timeout: 30_000 }).toBe(true);
    }

    async waitForHistory() {
        await expect.poll(() => this.frame().evaluate(() => document.body.dataset.history).catch(() => undefined), { timeout: 30_000 }).toBe("loaded");
    }

    /** End the board's `paginate_timeline` (the DevBackend's "Resolve pagination"). */
    async resolvePagination(count = 0, startReached = true) {
        await expect.poll(() => this.actions("fromWidget").then((a) => a.includes("org.matrix.mscXXXX.paginate_timeline")), { timeout: 30_000 }).toBe(true);
        await this.dispatch({ type: "mock/resolvePagination", roomId: ROOM, count, startReached });
    }

    dispatch(intent: Record<string, unknown>) {
        return this.page.evaluate((i) => (window as any).widgetHost.dispatch(i), intent);
    }

    /** The actions of the requests the board sent (`fromWidget`) or received (`toWidget`), oldest first. */
    actions(direction: "fromWidget" | "toWidget"): Promise<string[]> {
        return this.page.evaluate(([id, d]) =>
            (window as any).widgetHost.messages(id)
                .filter((m: any) => m.direction === d && !("response" in m.message))
                .map((m: any) => m.message.action), [WIDGET_ID, direction] as const);
    }

    /** The requests of one action the board sent, oldest first. */
    requests(action: string): Promise<any[]> {
        return this.page.evaluate(([id, a]) =>
            (window as any).widgetHost.messages(id)
                .filter((m: any) => m.direction === "fromWidget" && m.message.action === a && !("response" in m.message))
                .map((m: any) => m.message.request), [WIDGET_ID, action] as const);
    }

    /** The room's timeline in the DevBackend. */
    async timeline(): Promise<StoreEvent[]> {
        const store = await this.page.evaluate((r) => (window as any).widgetHost.store(r), ROOM);
        return store.timeline;
    }

    async boardEvents(): Promise<StoreEvent[]> {
        return (await this.timeline()).filter((e) => e.eventType === BOARD_EVENT);
    }

    /** Send an event into the room as anyone (the DevBackend's "Send event"). */
    sendEvent(event: SeedEvent) {
        return this.dispatch({ type: "roomTools/sendEvent", roomId: ROOM, event: { sender: ALICE, ...event } });
    }

    /** The objects of the board's ObjectStore, and whether each one is drawn on the canvas. */
    objects(): Promise<BoardObject[]> {
        return this.frame().evaluate(() => {
            const app = (window as any).AppData.instance;
            const drawn = new Set<string>();
            for (const item of app.drawingCanvas.drawLayer.getItems({})) {
                if (item.data?.id) drawn.add(item.data.id);
            }
            return Object.values(app.objectStore.all()).map((e: any) => ({
                id: e.event_id,
                sender: e.sender,
                objtype: e.content.objtype,
                drawn: drawn.has(e.event_id),
            }));
        });
    }

    /** Ids of every item on the draw layer (local echoes included). */
    drawnIds(): Promise<string[]> {
        return this.frame().evaluate(() => {
            const app = (window as any).AppData.instance;
            return app.drawingCanvas.drawLayer.getItems({}).map((item: any) => item.data?.id).filter((id: any) => id);
        });
    }

    /** Click a tool of the tool wheel. */
    async selectTool(id: string) {
        await this.frameLocator().locator(`#${id}`).click();
    }

    /** A point on the canvas, as page coordinates, relative to the canvas's top left corner. */
    async canvasPoint(x: number, y: number) {
        const box = await this.frameLocator().locator("#paper-canvas").boundingBox();
        if (!box) throw new Error("The canvas is not visible");
        return { x: box.x + x, y: box.y + y };
    }

    /** Press, drag through `points` (canvas coordinates) and release. */
    async drag(points: [number, number][]) {
        const [first, ...rest] = points;
        const start = await this.canvasPoint(...first);
        await this.page.mouse.move(start.x, start.y);
        await this.page.mouse.down();
        for (const p of rest) {
            const at = await this.canvasPoint(...p);
            await this.page.mouse.move(at.x, at.y, { steps: 8 });
        }
        await this.page.mouse.up();
    }

    async click(x: number, y: number) {
        const at = await this.canvasPoint(x, y);
        await this.page.mouse.click(at.x, at.y);
    }

    /** Fail on console errors and exceptions not matched by `allowed`. */
    expectNoErrors(allowed: RegExp[] = []) {
        const unexpected = this.errors.filter((e) => !allowed.some((a) => a.test(e)));
        expect(unexpected, "console errors").toEqual([]);
    }
}

export const test = base.extend<{ board: Board }>({
    board: async ({ page }, use) => {
        const board = new Board(page);
        await board.start();
        await use(board);
    },
});

/** `n` board text objects from `sender`, oldest first. */
export function textEvents(n: number, sender = BOB): SeedEvent[] {
    return Array.from({ length: n }, (_, i) => ({ type: BOARD_EVENT, sender, content: textContent(`seed ${i}`, (i % 20) * 60, Math.floor(i / 20) * 40) }));
}

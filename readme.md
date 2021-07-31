
# TheBoard
This project is a whiteboard (similar to OneNote) which is
using Matrix as its backend. All your drawings are stored in matrix rooms
on your matrix server and are accessible to anyone who is invited.

## DISCLAIMER!
The spec for the whiteboard events are still subject to change. It is **NOT** recommended to use it for anything else than testing during the Alpha!
It is recommended to always create seperate rooms just for testing this app. This way they can be left and replaced by new ones when the protocol changes!

![screenshotTWIM](https://user-images.githubusercontent.com/16718859/127622513-0c31b50d-effb-49d3-be7f-a7102084d8d3.png)

## How this project came to life
I was dreaming of a good open-source solution for OneNote for a long time.
There are great projects [Xournal++](https://xournalpp.github.io/) and [whitebophir](https://github.com/lovasoa/whitebophir).
But while Xournal++ entirely lacks collaborative whiteboard, needs self-hosting to be a reliable solution and has no method of structuring all my notes/whiteboards. (Not to mention, that even one notes collaboration features are really poor as well...)

These are my requirements for such a whiteboard:
 - Real time synchronization (cloud storage)
 - Authentication/account infrastucture (to invite and collaborate on one whiteboard)
 - Adding/Removing people to a whiteboard
 - Reliable hosting (when having cloud storage I don't want to trust a one-man project to continue hosting. And a lot of people won't self host.)
 - Structuring whiteboards in categories
 - Viewing history and display which part has been drawn by which person
 - Annotating other whiteboards with new layers
 - Hosting of media files like pdf's and images

Looking at this list, Matrix was such an obvious choice. I could comment every point but basically with: "A whiteboard should be a Matrix room" everything is said.

**TheBoard (probably not the final name) is exactly that.** The front end is not done yet but already in an okay looking and usable state.
**Before trying it out:** It takes really long to log in with an account with lots of rooms. So I highly recommend to NOT use your main Matrix account.
Additionally, it is necessary to tag rooms as whiteboards (really unintuitve UX that will be improved). But for now, the + button needs to be pressed and a (empty (not necassary but recommended) AND UNENCRYPTED) room needs to be selected.
The app is available at [toger5.github.io/TheBoard](toger5.github.io/TheBoard). \
_As always: use at your own Risk_

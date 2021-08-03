# TheBoard <!-- omit in toc -->
A collaborative Whiteboard powered by the [Matrix] protocol and infrastructure. 
### Table of Content: <!-- omit in toc -->
- [Introduction](#introduction)
  - [DISCLAIMER](#disclaimer)
  - [How this project came to life](#how-this-project-came-to-life)
- [Building / Developing](#building--developing)
  - [Structure and Technologies](#structure-and-technologies)
- [Planned Use-cases](#planned-use-cases)
# Introduction
This project is a whiteboard (similar to OneNote) which is
using Matrix as its backend. All your drawings are stored in Matrix rooms
on your Matrix server and are accessible to anyone who is invited.


##  DISCLAIMER
The [spec](https://github.com/toger5/TheBoard/blob/main/spec.md) for the whiteboard events are still subject to change. It is **NOT** recommended to use it for anything else than testing during the Alpha!
It is recommended to always create seperate rooms just for testing this app. This way they can be left and replaced by new ones when the protocol changes!

![screenshotTWIM](https://user-images.githubusercontent.com/16718859/127622513-0c31b50d-effb-49d3-be7f-a7102084d8d3.png)

##  How this project came to life
 I was dreaming of a good open source solution for OneNote or GoodNotes far a long time. There are already great projects, like [Xournal++](https://xournalpp.github.io/) and [whitebophir](https://github.com/lovasoa/whitebophir). But, they do not include the extent of possibilities to flexible host, collaborate and structuring the notes I have wished for.

Recently, I was thinking about the exact requirements I wanted for such a whiteboard:
 - Real time synchronization (cloud storage)
 - Authentication/account infrastucture (to invite and collaborate on one whiteboard)
 - Adding/Removing people to a whiteboard
 - Reliable hosting (when having cloud storage I don't want to trust a one-man project to continue hosting. And a lot of people won't self host.)
 - Structuring whiteboards in categories
 - Viewing history and display which part has been drawn by which person
 - Annotating other whiteboards with new layers
 - Hosting of media files like pdf's and images

Looking at this list, Matrix was such an obvious choice. I could comment every point but basically with: "A whiteboard should be a Matrix room" everything is said.

**TheBoard (probably not the final name) is exactly that.** The front end is not done yet but already in an okay looking and usable state.\
**Before trying it out:** It takes really long to log in with an account with lots of rooms. So I highly recommend to NOT use your main Matrix account.
Additionally, it is necessary to tag rooms as whiteboards (really unintuitve UX that will be improved). But for now, the + button needs to be pressed and a (empty (not necassary but recommended) AND UNENCRYPTED) room needs to be selected.
The app is available at 
<a href='https://toger5.github.io/TheBoard'> <h2> https://toger5.github.io/TheBoard</h2></a>
_As always: use at your own Risk_

 
# Building / Developing

The project uses webpack and yarn for the dependencies and the building. 
There are two yarn scripts in `package.json`:
 - `build`: Webpack builds the project into the `/dist/` folder (`/dist/` is part of the gitignore)
 - `start`: Webpack builds the project into `/distDev/` and hosts it on `localhost:8080`.

So, `yarn start` should get you up and running to develop on the app.

## Structure and Technologies
This section is for all those, who quickly want to get an understanding on how TheBoard works.\
The system is fairly simple. each stroke becomes a custom matrix event which describes the stroke by a vector path (similar to svg)
Whenever one of these events enter a room it gets drawn when received (in computer terms "realtime") on all connected clients from the users in that room.\
Take a look at the Spec for more details on how loading times are kept reasonable and what kind of events should be supported:  <a href='https://github.com/toger5/TheBoard/blob/main/spec.md'> <h3> Specification</h3></a>
For the drawing a HTML canvas is used. [Paper.js](https://paperjs.org/) turned out to be a great tool for wrapping the canvas in a more accessible layer. Two features are especially important. It provides an object tree which makes it really fast end easy to interact with the drawn element. For modifying and erasing, this is relevant to quickly find the event/stroke that was clicked. Additionally [paper.js](https://paperjs.org/) provides a bezier-curve fit function which works great, makes path look much smoother and reduces the amount of segments to describe a path by up to 10x. Additionally it also makes resizing and recalculating the canvas resolution really easy. I did that before manually and ... its easier with [paper.js](https://paperjs.org/).

# Planned Use-cases
TheBoard is can be used in multiple ways and they are all taken into consideration while designing/developing.
Matrix' real time abilities allow TheBoard to be used as such as well. Any stroke which is sent will be displayed on all other connected clients (almost) instantly. So it should be easy to set up **collaborative drawing/brain storming sessions** and join with an amazing auth system (Matrix account, SSO or Guest accounts).\
The next use case is for **long term secure and save personal notes**. Matrix is amazing in guaranteeing hosting. The Matrix.org server (and others like chat.mozilla.org ...) won't go in the foreseeable future. You cannot dream of a better "cloud file format" than a chat-room on a Matrix server. Even propitiatory software does not guarantee you that you can always move your rooms / whiteboard notes to your own server if the service is shut down. So I really want TheBoard to be suitable for long term notepads where anyone can create, share, and iterate on their ideas. It should become an ideal solution for taking university notes with, easily share them with colleagues and have structured access to your work years after graduation.\
Last I want a minimized version of **the application as a room widget**. Since joining a room is all that is needed to be part of a whiteboard, this even further minimizes the barrier of entry. Core users still could use the dedicated TheBoard app to structure the notes but people who just want check out a board can do so easily with one click in the widget.

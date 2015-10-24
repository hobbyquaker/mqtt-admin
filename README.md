# mqtt-admin

MQTT Web Frontend: Publish, Subscribe and see Topic Status in a comfortable UI. 

## getting started

Download [mqtt-admin.zip](https://github.com/hobbyquaker/mqtt-admin/releases/latest), unzip, put it on a webserver and 
open index.html with a modern browser. You can also give it a try by just visiting https://hobbyquaker.github.io/mqtt-admin

### Usage

mqtt-admin offers 3 tabs, Publish, Subscribe and Status, these are described in more detail below. Topic input fields offer
autocompletion, mqtt-admin subscribes # to get all availabe topics to be able to offer this. Broker settings, the UI state, 
subscriptions and the publish history are persisted in your browser local storage.

#### Publish

Just enter a topic and a payload and click the publish button. The payload input field can be resized vertically and has
a built in JSON linter - a checkmark below the input field will indicate valid JSON.

Every publish is saved in the history table, you can refill the input fields by clicking in history, a double click
immediatly publishes again (not retained).

#### Subscribe

It's possible to open a unlimited number of subscriptions tabs that can contain a unlimited number of single subscriptions.
You can color your subscriptions, but you have to select a color before you enter a topic and press enter. 
Subscription tabs can be renamed by double-clicking on the name.
Every subscription tab has Play/Pause/Stop buttons, pause will cache incoming messages and delay insertion into the DOM
until you activate play again. The trash button just clears the table.

#### Status

The status table shows the last-received payload of the listed topics, it's meant to keep an eye on e.g. _current_ sensor
data without being interested in previous data. 

#### Warnings

* This tool is meant to be used with keyboard and mouse, I do not plan any efforts on optimizing it for touch devices.
* Connecting to test.mosquitto.org will stress your browser (Many retained topics, big payloads, ...).

#### mqtt-smarthome

mqtt-admin contains some syntactic sugar for [mqtt-smarthome](https://github.com/mqtt-smarthome/) users (special columns
in status tab, auto-completion of // to /status/ and /set/)


## contributing

Pull Requests welcome!

Dependencies are managed with [Bower](http://bower.io/), [StealJS](http://stealjs.com/) takes care of module loading, 
the [Grunt](http://gruntjs.com/) task named "build" creates a production build in tmp dir.


## license

The MIT License (MIT)

Copyright (c) Sebastian Raff <hq@ccu.io> (https://github.com/hobbyquaker)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. 

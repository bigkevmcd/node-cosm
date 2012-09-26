# node-cosm

Cosm is the new name for Pachube.

"Connect devices and apps on the Cosm platform, exchange data and ideas with
developers, and bring smart products to the world."

# Install

    $ npm install cosm

# Use

```javascript

    var cosm = require('cosm');
        client = new cosm.Cosm('insert API key here'),
        feed = new cosm.Feed(cosm, {id: 12345}),
        stream = new cosm.Datastream(client, feed, {id: 1})

    stream.addPoint(1.234); // Adds a data point with the timestamp now

    // Creates a datapoint at a specific timestamp
    stream.addPoint(2.345, new Date(2012, 11, 11, 11, 11);

    // Creates a datapoint now, with a callback - this API will likely change to
    // be a bit nicer to use.
    stream.addPoint(3.456, undefined, function () {
        console.log("Point added...");
    });
```

## READ THIS

You can queue data to be uploaded, by setting the queue_size for the Datastream, the
API will only push data to Cosm when the queue is full.


```javascript
    var stream = new cosm.Datastream(client, feed, {id: 1, queue_size: 20});
```
The queue_size defaults to 1, so data is pushed as it's added.

# License

(The MIT License)

Copyright (c) 2012 Kevin McDermott.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

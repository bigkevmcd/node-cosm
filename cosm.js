'use strict';

var request = require('request'),
    _ = require('underscore');

function Cosm(apiKey, options) {
    var self = this;

    options = options || {};
    self.apiKey = apiKey;
    self.server = options.server || 'http://api.cosm.com';
}


function Queue(maximum) {
    var self = this;

    self.queue  = [];
    self.offset = 0;
    self.maximum = maximum;
}

/*
 * Return true if the queue is empty.
 */
Queue.prototype.isEmpty = function() {
    return (this.queue.length === 0);
};

/*
 * Return true if the queue is full.
 */
Queue.prototype.isFull = function () {
    return this.getLength() === this.maximum;
};
/*
 * Returns the length of the queue.
 */
Queue.prototype.getLength = function() {
    return (this.queue.length - this.offset);
}

/*
 * Enqueues an item.
 * 
 * Throws an error if the queue size would be exceeded by enqueing the item.
 */
Queue.prototype.enqueue = function(item) {
    if (this.getLength() === this.maximum) {
        throw new Error('Queue size ' + this.maximum + ' exceeded.');
    }
    this.queue.push(item);
};

/*
 * Dequeue an item and return it.
 * 
 * Returns undefined if the queue is empty.
 */
Queue.prototype.dequeue = function () {
    if (this.queue.length === 0)
        return undefined;
    var item = this.queue[this.offset];

    if (++ this.offset * 2 >= this.queue.length){
        this.queue  = this.queue.slice(this.offset);
        this.offset = 0;
    }
    return item;
};

Cosm.prototype.get = function (id, callback) {
    var self = this;
     request.get(
         {url: self.server + '/v2/feeds/' + id,
          headers: {'X-ApiKey': self.apiKey}
    }, function (error, response, body) {
        body = JSON.parse(body);
        if (typeof callback !== 'undefined') {
            if (response.statusCode === 200) {
                callback(null, new Feed(self, body));
            } else {
                callback(body);
            }
        }
    });
};


function Datastream(cosm, feed, options) {
    var self = this;

    self._cosm = cosm;
    self._feed = feed;
    options = options || {};

    if (typeof cosm === 'undefined' ||
        typeof feed === 'undefined') {
        throw new Error('Must provide a Cosm and Feed for this Datastream.');
    }

    self.id = options.id;
    self._queue_size = (typeof options.queue_size === 'undefined') ? 1 : options.queue_size;
    if (self._queue_size < 1 || self._queue_size > 500) {
        throw new Error('queue must be between 1 and 500.');   
    }
    self._queue = new Queue(self._queue_size);
}

Datastream.prototype.toJSON = function () {
    var values = _.clone(this);
    _.each(values, function (value, key, list) {
        if (key[0] === '_' ||
          typeof value === 'undefined' ||
          typeof value === 'function') {
            delete values[key];
        };
    });
    return values;
};

/*
 * This is here because we can't use Sinon's fake timer with node-jasmine
 * https://github.com/mhevery/jasmine-node/issues/171
 */
Datastream.prototype.getDate = function () {
    return new Date();
}

Datastream.prototype.addPoint = function (value, at, callback) {
    var self = this;
    if (typeof at === "undefined") {
        at = self.getDate();
    }
    self._queue.enqueue({at: at, value: value.toString()});
    if (self._queue.isFull()) {
        var points = [],
            value = self._queue.dequeue(),
            url = self._cosm.server + '/v2/feeds/' + self._feed.id + '/datastreams/' + self.id + '/datapoints';

        while (typeof value !== "undefined") {
            points.push(value);
            value = self._queue.dequeue();
        }
        request.post({url: url, json: {datapoints: points}, headers: {'X-ApiKey': self._cosm.apiKey}}, callback);
    }
};

function Feed(cosm, options) {
    var self = this;

    self._cosm = cosm;
    options = options || {};

    if (typeof options.title === 'undefined' &&
        typeof options.id === 'undefined') {
        throw new Error('Must provide a title or id.');
    }
    self.title = options.title;
    self.version = options.version || '1.0.0';
    self.website = options.website;
    self.tags = options.tags || [];
    self.id = options.id;
    self.private = options.private || false;
}

Feed.prototype.toJSON = function () {
    var values = _.clone(this);
    _.each(values, function (value, key, list) {
        if (key[0] === '_' ||
          typeof value === 'undefined' ||
          typeof value === 'function') {
            delete values[key];
        };
    });
    return values;
};

Feed.prototype.addTag = function (tag) {
  this.tags.push(tag);
};

Feed.prototype.removeTag = function (tag) {
  this.tags.splice(this.tags.indexOf(tag), 1);
};

Feed.prototype.save = function (callback) {
    var self = this,
        method = 'put',
        url = '/v2/feeds/' + self.id;

    if (typeof self.id === 'undefined') {
        method = 'post';
        url = '/v2/feeds';
    };
    request({url: self._cosm.server + url,
             json: self.toJSON(),
             method: method,
             headers: {'X-ApiKey': self._cosm.apiKey}
    }, callback);
};


Feed.prototype.delete = function (callback) {
    var self = this,
        url = '/v2/feeds/' + self.id;

    request({url: self._cosm.server + url,
             method: 'delete',
             headers: {'X-ApiKey': self._cosm.apiKey}
    }, callback);
};



exports.Cosm = Cosm;
exports.Feed = Feed;
exports.Datastream = Datastream;
exports.Queue = Queue;
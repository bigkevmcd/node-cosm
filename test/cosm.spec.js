'use strict';

var cosm = require('../cosm'),
    nock = require('nock'),
    API_KEY = 'aaaaaaYPYLTFbVvgnZhOTJU9ODmSAKxhZlY0UG5mSCaaaaaa';


describe("Queue", function () {
    describe(".isEmpty", function () {
        it("should return a true value if there are no items in the queue", function () {
            var queue = new cosm.Queue(20);
            expect(queue.isEmpty()).toBeTruthy();
        });
    });
    describe(".isFull", function () {
        it("should return a true value if the queue is full", function () {
            var queue = new cosm.Queue(1);
            queue.enqueue(1);
            expect(queue.isFull()).toBeTruthy();
        });
        it("should return a false value if the queue is not full", function () {
            var queue = new cosm.Queue(10);
            queue.enqueue(1);
            expect(queue.isFull()).toBeFalsy();
        });
        it("should reflect the current state of the queue", function () {
            var queue = new cosm.Queue(2);
            queue.enqueue(1);
            queue.enqueue(2);
            expect(queue.isFull()).toBeTruthy();
            queue.dequeue();
            expect(queue.isFull()).toBeFalsy();
        });
    });
    describe(".getLength", function () {
        // Opted to make this a function because calling .length would look odd.
        it("should return the current number of items in the queue", function () {
            var queue = new cosm.Queue(20);
            expect(queue.getLength()).toEqual(0);
        });
    });
    describe(".enqueue", function () {
        var queue;
        beforeEach(function () {
            queue = new cosm.Queue(3);
        });
        it("should queue an item", function () {
            queue.enqueue({at: new Date(), value: 12345});
            expect(queue.getLength()).toEqual(1);
            expect(queue.isEmpty()).toBeFalsy();
        });
        it("should throw an error if we exceed the queue size", function() {
            queue.enqueue(1);
            queue.enqueue(2);
            queue.enqueue(3);
            expect(function () {
               queue.enqueue(4);
            }).toThrow(new Error('Queue size 3 exceeded.'));
        });
    });
    describe(".dequeue", function () {
        var queue;
        beforeEach(function () {
            queue = new cosm.Queue(3);
        });
        it("should dequeue an item and return it", function () {
            queue.enqueue(1);
            queue.enqueue(2);

            expect(queue.dequeue()).toEqual(1);
            expect(queue.dequeue()).toEqual(2);
            expect(queue.getLength()).toEqual(0);
        });
        it("should return undefined if the queue is empty", function () {
            expect(queue.dequeue()).toBeUndefined();
        });
    });
});

describe("Cosm", function () {
    describe("the constructor", function () {
        it("is created with an API key", function () {
            var client = new cosm.Cosm(API_KEY);
        });
    });
    describe(".get", function () {
        it("should fetch a feed by id", function (done) {
            var client = new cosm.Cosm(API_KEY),
                service = nock('http://api.cosm.com')
                    .matchHeader('X-ApiKey', API_KEY)
                    .get('/v2/feeds/7021')
                    .replyWithFile(200, __dirname + '/fixtures/get_7021.json',
                                  {'Content-Type': 'application/json; charset=utf-8'});
            client.get(7021, function (error, cosm) {
                expect(cosm.title).toEqual('Cosm Office environment');
                expect(cosm.id).toEqual(7021);
                done();
            });
        });
        it("should return an error if the feed doesn't exist", function(done) {
            var client = new cosm.Cosm(API_KEY),
                service = nock('http://api.cosm.com')
                    .matchHeader('X-ApiKey', API_KEY)
                    .get('/v2/feeds/7021')
                    .reply(404, '{"title": "Not found", "errors": "I\'m sorry we are unable to find the resource you are looking for."}',
                          {'Content-Type': 'application/json; charset=utf-8'});
            client.get(7021, function (error, cosm) {
                expect(cosm).toBeUndefined();
                expect(error.title).toEqual('Not found');
                expect(error.errors).toEqual("I'm sorry we are unable to find the resource you are looking for.");
                done();
            });
        });
    });
})

describe("Datastream", function () {
    var client = new cosm.Cosm(API_KEY),
        feed = new cosm.Feed(client, {title: '1.0.1', id: 12345});

    describe("instantiation", function () {
        it("should throw an error if no Cosm and Feed are supplied", function () {
            expect(function () {
               var stream = new cosm.Datastream();
            }).toThrow(new Error('Must provide a Cosm and Feed for this Datastream.'));
        });
        it("should allow a queue_size parameter in the options", function () {
            var stream = new cosm.Datastream(client, feed, {queue_size: 20});
            expect(stream._queue_size).toEqual(20);
        });
        it("should default to a queue_size of 1", function () {
            var stream = new cosm.Datastream(client, feed);
            expect(stream._queue_size).toEqual(1);
        });
        it("should not allow the queue to be over 500", function () {
            expect(function () {
               var stream = new cosm.Datastream(client, feed, {queue_size: 501});
            }).toThrow(new Error('queue must be between 1 and 500.'));
        })
        it("should not allow the queue to be less than 1", function () {
            expect(function () {
               var stream = new cosm.Datastream(client, feed, {queue_size: 0});
            }).toThrow(new Error('queue must be between 1 and 500.'));
        });
    });
    describe(".toJSON", function () {
        var stream = new cosm.Datastream(client, feed, {id: 1});
        expect(stream.toJSON()).toEqual({id: 1});
    });
    describe(".addPoint", function () {
        var stream,
            clock,
            old_getDate,
            testDate = new Date(2012,9,22,11,33,0);
        beforeEach(function () {
            old_getDate = cosm.Datastream.prototype.getDate;
            cosm.Datastream.prototype.getDate = function () {
                return testDate;
            }
            stream = new cosm.Datastream(client, feed, {id: 1})

        });
        afterEach(function () {
            cosm.Datastream.prototype.getDate = old_getDate;
        });
        it ("should send the data point to Cosm", function (done) {
            var service = nock('http://api.cosm.com')
                .matchHeader('X-ApiKey', API_KEY)
                .post('/v2/feeds/12345/datastreams/1/datapoints', {
                    datapoints: [
                        {at: testDate.toISOString(), value: "1.234"}
                    ]})
                .reply(200, '', {'Content-Type': 'application/json; charset=utf-8'});
            stream.addPoint(1.234, undefined, function () {
                service.done();
                done();
            });
        });
        it ("should accept an optional timestamp", function (done) {
            var timestampDate = new Date(2012, 09, 23, 9, 27, 51),
                service = nock('http://api.cosm.com')
                    .matchHeader('X-ApiKey', API_KEY)
                    .post('/v2/feeds/12345/datastreams/1/datapoints', {
                        datapoints: [
                            {at: timestampDate.toISOString(), value: "2.345"}
                        ]})
                    .reply(200, '', {'Content-Type': 'application/json; charset=utf-8'});
            stream.addPoint(2.345, timestampDate, function () {
                service.done();
                done();
            });
        });
        it ("should queue data points if the queue is larger than 1", function (done) {
            var queuedStream = new cosm.Datastream(client, feed, {id: 1, queue_size: 2}),
                date1 = new Date(2012,9,22,11,32,0),
                date2 = new Date(2012,9,22,11,33,0),
                service = nock('http://api.cosm.com')
                    .matchHeader('X-ApiKey', API_KEY)
                    .post('/v2/feeds/12345/datastreams/1/datapoints', {
                        datapoints: [
                            {at: date1.toISOString(), value: "3.456"},
                            {at: date2.toISOString(), value: "4.567"}
                        ]})
                    .reply(200, '', {'Content-Type': 'application/json; charset=utf-8'});
            queuedStream.addPoint(3.456, date1);
            queuedStream.addPoint(4.567, date2, function (){
                service.done();
                done();
            });
        });
    });
});

describe("Feed", function() {
    var client = new cosm.Cosm(API_KEY);
    describe("the constructor", function () {
        it("can be created with a title", function () {
            var feed = new cosm.Feed(client, {title: 'My Title'});
            expect(feed._cosm).toBe(client);
            expect(feed.title).toBe('My Title');
        });
        it("should default to version 1.0.0", function () {
            var feed = new cosm.Feed(client, {title: 'My Title'});
            expect(feed.version).toBe('1.0.0');
        });
        it("should accept a version in the options hash", function () {
            var feed = new cosm.Feed(client, {title: 'My Title', version: '1.0.1'});
            expect(feed.version).toBe('1.0.1');
        });
        it("should accept a website in the options hash", function () {
            var feed = new cosm.Feed(client, {title: 'My Title', website: 'http://example.com/'});
            expect(feed.website).toBe('http://example.com/');
        });
        it("should throw an error if no title and no id supplied", function () {
            expect(function(){
                var feed = new cosm.Feed(client, {version: '1.0.1'});
            }).toThrow(new Error('Must provide a title or id.'));
        });
        it("should default to an empty set of tags", function () {
            var feed = new cosm.Feed(client, {title: 'My Title'});
            expect(feed.tags).toEqual([]);
        });
        it("should accept an array of tags", function () {
            var feed = new cosm.Feed(client, {title: 'My Title', tags: ['test']});
            expect(feed.tags).toEqual(['test']);
        });
        it("should default to public", function () {
            var feed = new cosm.Feed(client, {title: 'My Title'});
            expect(feed.private).toBeFalsy();
        });
        it("should allow us to set the private flag in the options", function () {
            var feed = new cosm.Feed(client, {title: 'My Title', private: true})
            expect(feed.private).toBeTruthy();
        });
    });

    describe(".toJSON", function () {
        var feed = new cosm.Feed(client, {title: 'My Title'});
        expect(feed.toJSON()).toEqual({title: 'My Title', version: '1.0.0', tags: [], private: false});
    });

    describe(".save", function () {
        it("should post to the cosm server if it's a new feed", function (done) {
            var feed = new cosm.Feed(client, {title: 'My Title'}),
                service = nock('http://api.cosm.com')
                    .matchHeader('X-ApiKey', API_KEY)
                    .post('/v2/feeds', feed.toJSON())
                    .reply(200, 'OK', {'Location': 'http://api.cosm.com/feeds/12345'});
            feed.save(function () {
                done();
            });
        });
        it("should put to the cosm server if it's updating an existing feed", function (done) {
            var feed = new cosm.Feed(client, {title: 'My Title', id: 12345}),
                service = nock('http://api.cosm.com')
                    .matchHeader('X-ApiKey', API_KEY)
                    .put('/v2/feeds/12345', feed.toJSON())
                    .reply(200, 'OK', {'Location': 'http://api.cosm.com/feeds/12345'});
            feed.save(done)
        });
    });

    describe(".delete", function () {
        it("should request the deletion of the feed",  function (done) {
            var feed = new cosm.Feed(client, {id: 76591}),
                service = nock('http://api.cosm.com')
                    .matchHeader('X-ApiKey', API_KEY)
                    .delete('/v2/feeds/76591')
                    .reply(200, " ", {'content-type': 'application/json; charset=utf-8'});
            feed.delete(function () {
                service.done();
                done();
            });
        });
    });

    describe("Tags", function () {
        var feed;
        beforeEach(function () {
            feed = new cosm.Feed(client, {title: 'My Title'});
        });
        it("should be possible to add a tag", function() {
            feed.addTag('testing');
            expect(feed.tags).toEqual(['testing']);
        });
        it("should be possible to remove a tag", function() {
            feed.addTag('testing');
            feed.removeTag('testing');
            expect(feed.tags).toEqual([]);
        });
    });
});

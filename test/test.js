var expect = require('expect.js');
var happn = require('happn')
var service = happn.service;
var happn_client = happn.client;
var serviceInstance;
var clientInstance;
var testId = require('shortid').generate();
var RandomActivity = require('../index');
var fs = require('fs');

describe('random_activity_generator', function() {

	var generator;
	var test_file = __dirname + '/test-resources/c7/test/' + testId + '1.test';

	var serviceConfig1 =  {
	    secure:true,
	    services: {
	      data: {
	        path: './services/data_embedded/service.js',
	        config:{
	           filename:test_file
	        }
	      }
	    }
	  }

	this.timeout(10000);

	before('instantiates the generator', function (callback) {

		service.create(serviceConfig1,function(e, instance){
			if (e) return callback(e);
			serviceInstance = instance;

			happn_client.create({config:{username:'_ADMIN',password:'happn'}},function(e, cli){

				if (e) return callback(e);
				clientInstance = cli;
				generator = new RandomActivity(clientInstance);
				callback();
			});
		})

	});

	after('it shuts down the test dbs, and unlinks their file', function(callback){
	    serviceInstance.stop(function(e){
	      fs.unlinkSync(test_file);
	      callback();
	    });
	  });

	it('initializes the activity log', function (callback) {

		var log = generator.__initializeActivity('test');
		expect(log.initial.remove).to.be(0);
		expect(log.initial.on).to.be(0);
		expect(log.initial.get).to.be(0);
		expect(log.get).to.be(0);
		expect(log.set).to.be(0);
		expect(log.remove).to.be(0);
		expect(log.on).to.be(0);
		callback();

	});

	it('generates a random path', function (callback) {
		var path = generator.__generateRandomPath('test');

		expect(path).to.not.be(null);
		expect(path.indexOf("/random_activity_generator/test/")).to.be(0);
		callback();
	});

	it('generates a random data item', function (callback) {
		var data = generator.__generateRandomData('test');

		expect(data).to.not.be(null);
		expect(data.bigData.length).to.be(32 * 3);
		callback();
	});

	it('creates initial data', function (callback) {

		generator.__initializeActivity("test");

		generator.__generateInitialData('test', function(e, log){
			if (e) return callback(e);


			expect(log.initial.remove).to.be(40);
			expect(log.initial.on).to.be(20);
			expect(log.initial.get).to.be(50);

			callback();
		});

	});

	it("gets a random path from the initial data", function (callback){
		generator.__initializeActivity("test");

		generator.__generateInitialData('test', function(e, log){
			if (e) return callback(e);

			var removePath1 = generator.__getRandomPathFromInitial("test","remove");
			var removePath2 = generator.__getRandomPathFromInitial("test","remove");

			var getPath1 = generator.__getRandomPathFromInitial("test","get");
			var getPath2 = generator.__getRandomPathFromInitial("test","get");

			var onPath1 = generator.__getRandomPathFromInitial("test","on");
			var onPath2 = generator.__getRandomPathFromInitial("test","on");

			expect(removePath1).to.not.be(null);
			expect(removePath2).to.not.be(null);
			expect(getPath1).to.not.be(null);
			expect(getPath2).to.not.be(null);
			expect(onPath1).to.not.be(null);
			expect(onPath2).to.not.be(null);

			expect(removePath1).to.not.be(removePath2);
			expect(getPath1).to.not.be(getPath2);
			expect(onPath1).to.not.be(onPath2);

			callback();

		});
	});

	it('creates random operation types', function (callback) {
		var operationTypes = {};

		for(var i = 0;i < 100;i++){
			var opType = generator.__getRandomOperationType();
			if (!operationTypes[opType])
				operationTypes[opType] = 1;
			else
				operationTypes[opType]++;
		}

		expect(operationTypes['get'] <= 30).to.be(true);
		expect(operationTypes['set'] <= 80).to.be(true);
		expect(operationTypes['remove'] <= 30).to.be(true);
		expect(operationTypes['on'] <= 30).to.be(true);
		callback();
	});

	it('can do a log update', function (callback) {

		generator.__initializeActivity("test");

		var testOperation = {
			opType:"set"
		}

		var testResponse = {
			"response":"test"
		}

		var testError = new Error("test");

		var logUpdate = generator.__updateLog("test", testOperation, testResponse, testError);
		expect(logUpdate.error.toString()).to.be("Error: test");
		expect(generator.__operationLogAggregated["test"]["set"]).to.be(1);

		callback();
	});

	it('can do a set operation', function (callback) {

		generator.__initializeActivity("test");

		var operationLogItem = {
          opType:"set",
          path:generator.__generateRandomPath('test'),
          data:generator.__generateRandomData('test')
        };

        generator.__doOperation("test", operationLogItem, function(key, operationLogItem, response, e){
        	if (e) return callback(e);
        	expect(generator.__operationLogAggregated["test"]["set"]).to.be(1);
        	expect(generator.__operationLog[key].length).to.be(1);
        	callback();
        });


	});

	it('can do a get operation', function (callback) {
		generator.__initializeActivity("test");

		generator.__generateInitialData('test', function(e, log){
			if (e) return callback(e);
			var testPath = generator.__generateRandomPath('test', 'get');
			var operationLogItem = {
	          opType:"get",
	          path:testPath
	        };

	        generator.__doOperation("test", operationLogItem, function(key, operationLogItem, response, e){

	        	if (e) return callback(e);

	        	expect(generator.__operationLogAggregated["test"]["get"]).to.be(1);
	        	expect(generator.__operationLog[key].length).to.be(1);
	        	expect(generator.__operationLog[key][0].path).to.be(testPath);
	        	expect(generator.__operationLog[key][0].response).to.not.be(null);

	        	callback();

	        });

		});
	});

	it('can do an on operation', function (callback) {
		generator.__initializeActivity("test");

		generator.__generateInitialData('test', function(e, log){
			if (e) return callback(e);
			var testPath = generator.__generateRandomPath('test', 'on');
			var operationLogItem = {
	          opType:"on",
	          path:testPath
	        };

	        generator.__doOperation("test", operationLogItem, function(key, operationLogItem, response, e){

	        	if (e) return callback(e);

	        	expect(generator.__operationLogAggregated["test"]["on"]).to.be(1);
	        	expect(generator.__operationLog[key].length).to.be(1);

	        	expect(generator.__operationLog[key][0].path).to.be(testPath);
	        	expect(generator.__operationLog[key][0].response >= 0).to.be(true);

	        	callback();

	        });

		});
	});

	it('can do a remove operation', function (callback) {
		generator.__initializeActivity("test");

		generator.__generateInitialData('test', function(e, log){
			if (e) return callback(e);
			var testPath = generator.__generateRandomPath('test', 'remove');
			var operationLogItem = {
	          opType:"remove",
	          path:testPath
	        };

	        generator.__doOperation("test", operationLogItem, function(key, operationLogItem, response, e){

	        	if (e) return callback(e);

	        	expect(generator.__operationLogAggregated["test"]["remove"]).to.be(1);
	        	expect(generator.__operationLog[key].length).to.be(1);
	        	expect(generator.__operationLog[key][0].path).to.be(testPath);
	        	expect(generator.__operationLog[key][0].response).to.not.be(null);

	        	callback();

	        });

		});
	});

	it('can do operations over time', function (callback) {
		generator.generateActivityStart("test", function(){
			setTimeout(function(){
				generator.generateActivityEnd("test", function(aggregatedLog){

					callback();
				});

			}, 2000);
		});
	});

	it('can verify operations over time', function (callback) {
		generator.generateActivityStart("test", function(){
			setTimeout(function(){
				generator.generateActivityEnd("test", function(aggregatedLog){

					generator.verify(function(e, log){

						callback();
					},"test");

				});

			}, 2000);
		});
	});

	it('can replay', function (callback) {
		generator.generateActivityStart("test", function(){
			setTimeout(function(){
				generator.generateActivityEnd("test", function(aggregatedLog){

					var RandomActivity = require('../index');
					generator2 = new RandomActivity(clientInstance);
					generator2.replay(generator, "test", function(e, replayLog){

						if (e) return callback(e);

						expect(replayLog.get).to.be(aggregatedLog.get);
						expect(replayLog.set).to.be(aggregatedLog.set);
						expect(replayLog.remove).to.be(aggregatedLog.remove);
						expect(replayLog.on).to.be(aggregatedLog.on);

						callback();

					});

				});

			}, 2000);
		});
	});

	it('can run in daemon mode', function (callback) {
		generator.generateActivityStart("test", function(){
			setTimeout(function(){
				generator.generateActivityEnd("test", function(aggregatedLog){
					expect(generator.__operationLog["test"].length > 0).to.be(true);
					generator.generateActivityStart("test", function(){
					setTimeout(function(){
						generator.generateActivityEnd("test", function(aggregatedLog){
							expect(aggregatedLog.get > 0).to.be(true);
							expect(aggregatedLog.set > 0).to.be(true);
							expect(aggregatedLog.on > 0).to.be(true);
							expect(aggregatedLog.remove > 0).to.be(true);
							expect(generator.__operationLog["test"].length).to.be(0);
							callback();
						});
					}, 2000);
				}, "daemon");
				});
			}, 1000);
		});
	});

	it('return random items from an array', function (callback) {

		var array = [0,1,2,3,4,5,6,7,8,9];

		var found = {};

		while(Object.keys(found).length < 10){
			var item = generator.__selectRandomArrayItem(array);
			found[generator.__selectRandomArrayItem(array)] = true;
		}

		callback();

	});

	it('can add random prefixes to the test path', function (callback) {
		var generator1 = new RandomActivity(clientInstance, {pathPrefix:['/testpathprefix1/' + testId, '/testpathprefix2/' + testId]});

		generator1.generateActivityStart("test", function(){
			setTimeout(function(){
				generator1.generateActivityEnd("test", function(aggregatedLog){
					clientInstance.get('/testpathprefix1/' + testId + "/*", function(e, results){
						expect(results.length > 0).to.be(true);
						clientInstance.get('/testpathprefix2/' + testId + "/*", function(e, results){
							expect(results.length > 0).to.be(true);
							callback();
						});
					});
				});
			}, 2000);
		});

	});

});
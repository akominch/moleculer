"use strict";

let _ = require("lodash");
let path = require("path");
let glob = require("glob");

let utils = require("../../src/utils");
let ServiceBroker = require("../../src/service-broker");
let MemoryCacher = require("../../src/cachers").Memory;

let cache = require("../../src/middlewares/cache");

// Create broker
let broker = new ServiceBroker({
	nodeID: "server",
	logger: console,
	logLevel: "debug"
});

function middleware1() {
	return function mw1(ctx, next) {

		ctx.logger.info("mw1 before", ctx.action.name);
		// return Promise.resolve("data from mw1");
		return next().then(res => {
			ctx.logger.info("mw1 after", ctx.action.name);
			return res;
		});

	};
}

function middleware2() {
	return function mw2(ctx, next) {

		ctx.logger.info("mw2 before-promise", ctx.action.name);
		let p = new Promise((resolve) => {
			setTimeout(() => {
				ctx.logger.info("mw2 before", ctx.action.name);
				//resolve("data from mw2");
				resolve();
			}, 300);
		});

		return next(p).then(res => {
			ctx.logger.info("mw2 after", ctx.action.name);
			return res;
		});

	};
}

function middleware3() {
	return function mw3(ctx, next) {
		ctx.logger.info("mw3 before", ctx.action.name);
		//return Promise.resolve("data from mw3");
		return next().then(res => {
			ctx.logger.info("mw3 after", ctx.action.name);
			if (res) {
				if (ctx.action.name == "users.get")
					delete res.gravatar;
				if (ctx.action.name == "posts.get")
					delete res.content;
			}
			return res;
		});
	};
}




broker.use(cache(broker, new MemoryCacher()));
broker.use(middleware1());
broker.use(middleware2());
broker.use(middleware3());

//broker.loadServices(path.join(__dirname, ".."));
broker.loadService(path.join(__dirname, "..", "post.service.js"));
broker.loadService(path.join(__dirname, "..", "user.service.js"));
broker.start();


broker.call("posts.get", { id: 3 }).then(console.log)
.then(() => {
	console.log("NEXT CALL FROM CACHE");
	return broker.call("posts.get", { id: 3 }).then(console.log);
})
.then(() => {
	console.log("CLEAR CACHE");
	return broker.emit("cache.clean", { match: "posts.*" });
})
.then(utils.delay(200))
.then(() => {
	console.log("NEXT CALL WITHOUT CACHE");
	return broker.call("posts.get", { id: 3 }).then(console.log);
});

/*
let ctx = { action: { name: "test" }, duration: 0, logger: broker.logger };
let mainAction = () => {
	return new Promise((resolve) => {
		setTimeout(() => {
			console.log("CALL");
			resolve({ a: 1 });		
		}, 300);
	});
};

broker.callMiddlewares(ctx, mainAction).then(res => {
	console.log("Invoke", res);
});

*/
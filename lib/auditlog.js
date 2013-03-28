;/*

	auditlog - an audit log module for node.js
	==============================================================

	auditlog.log(actor,context,action,target,description,data)
	
	actor (string) - an identifier for the user who is triggering the action
	context (string) - the origin of the event, like a module, plugin, server instance...
	action (string) - an identifier for the action taken by the actor
	target (string) - the object affected by the logged action
	description (string) - a human-friendly description of what happened
	data (object) - any data that should be logged with the event. must be JSON'able 

*/

var
	_ = require('lodash');

var AuditLog = (function () {
	
	var Logger = function (options) {
	
		this.transports = [];
		this.triggers = {};
		
	}
	
	_.extend(Logger.prototype, {
		
		addTransport: function (transport) {
			this.transports.push(transport);
		},
		
		log: function (actor, context, action, target, description, data) {

			var self = this; 

			// send to registered transports
			_(this.transports).each(
				function (transport) { 
					transport.log(actor, context, action, target, description, data); 
				}
			);

			// find and call triggers for this context/action
			_(this.triggers).pick(['*', context]).each(function (ctx) {
				_(ctx).pick(['*', action]).each(function (axn) {
					if (_.isArray(axn)) {
						_(axn).each( function (trigger) {
							if (_.isFunction(trigger)) {
								trigger.call(self, actor, context, action, target, description, data);
							}
						});
					}
				});
			});
		},
		
		on: function (context, action, trigger) {
			
			if (!_.has(this.triggers, context)) {
				this.triggers[context] = {};
			}
			if (!_.has(this.triggers[action], context)) {
				this.triggers[context][action] = [];
			}
			var triggers = this.triggers[context][action];
			if (!_.contains(triggers, trigger)) {
				triggers.push(trigger);
			}
		}
		
	});
	
	return Logger;
	
})();

AuditLog.transports = {}
AuditLog.triggers = {}

AuditLog.transports.ConsoleTransport = (function () {
		
	return function (options) {
		
		this.log = function (actor, context, action, target, description, data) {
			console.log('--- AuditEvent [ '+context+' / '+action+' ] ----------');
			console.log('  > Actor      : '+actor);
			console.log('  > Target     : '+target);
			console.log('  > Description: '+description);
			console.log('  > Data       : ');
			console.dir(data);
			console.log('--- /AuditEvent ------------------------------');
		}
	}
	
})();

AuditLog.transports.MongoTransport = (function () {
	
	var
		mongoose = require('mongoose'),
		Schema = mongoose.Schema;

	var schema = new Schema({
		createdAt: {
			type: Date,
			index: true,
			default: Date.now
		},
		actor: {
			type: String
		},
		context: {
			type: String
		},
		action: {
			type: String
		},
		target: {
			type: String
		},
		description: {
			type: String
		},
		data: {
			type: Schema.Types.Mixed
		}
	});
	
	schema.index({ createdAt: -1, actor: 1, context: 1, action: 1 });
	schema.index({ createdAt: -1, target: 1, context: 1, action: 1 });
	
	
	var MongoTransport = function (options) {
	
		this.options = _.defaults(options || {}, {
			mongoUrl: null,
			collection: 'auditevents'
		});

		if (!_.isNull(this.options.mongoUrl)) {
			this.db = mongoose.createConnection(this.options.mongoUrl);
		} else {
			this.db = mongoose.connection;
		}
		
		this.model = this.db.model('AuditEvent', schema, this.options.collection);
		
	}
	
	MongoTransport.prototype.log = function (actor, context, action, target, description, data) {
		this.model.create({
			actor: actor,
			context: context,
			action: action,
			target: target,
			description: description,
			data: data
		});
	}
	
	return MongoTransport;
});

exports = module.exports = AuditLog;
var _ = require('lodash');

exports.ConsoleTransport = (function () {
		
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

exports.MongoTransport = (function () {
	
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
			type: Schema.Types.ObjectId
		},
		context: {
			type: String
		},
		action: {
			type: String
		},
		target: {
			type: Schema.Types.ObjectId
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
		}, function (err, res) {
			if (err) console.dir(err);
		});
	}
	
	return MongoTransport;
})();
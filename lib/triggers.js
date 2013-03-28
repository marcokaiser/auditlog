var mailer = require('nodemailer'),
		util = require('util'),
		_ = require('lodash');

exports.EmailTrigger = (function () {
	
	return function (email, options) {
		
		var opts = _.defaults(options || {}, {
			from: 'AuditLog <auditlog@localhost>',
			subjectPrefix: '[AUDIT-LOG] '
		});
		
		if (!_.has(opts, 'transport')) {
			opts.transport = mailer.createTransport('sendmail');
		}
		
		return function (actor, context, action, target, description, data) {
			var lines = [];
			lines.push(
				'AuditLog Email Trigger - A matching event was logged:',
				'-----------------------------------------------------',
				'  Actor: '+actor,
				'  Action: '+context+' / '+action,
				'  Target: '+target,
				'  Description: '+description,
				'',
				'  --- DATA ------------------------------------------',
				util.inspect(data)
			);
			opts.transport.sendMail({
				from: opts.from,
				to: email,
				subject: opts.subjectPrefix+'An event was logged: '+context+' / '+action,
				text: lines.join('\n')
			});
		}
		
	}
	
})();
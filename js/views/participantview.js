/* global Marionette, Handlebars */

/**
 *
 * @copyright Copyright (c) 2017, Daniel Calviño Sánchez (danxuliu@gmail.com)
 *
 * @license GNU AGPL version 3 or any later version
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

(function(OC, OCA, Marionette, Handlebars) {
	'use strict';

	OCA.SpreedMe = OCA.SpreedMe || {};
	OCA.SpreedMe.Views = OCA.SpreedMe.Views || {};

	var TEMPLATE = ''+
		'<form class="oca-spreedme-add-person">'+
		'	<input class="add-person-input" type="text" placeholder="'+t('spreed', 'Add participant …')+'"/>'+
		'</form>'+
		'<ul class="participantWithList">' +
		'</ul>';

	OCA.SpreedMe.Views.ParticipantView = Marionette.View.extend({

		tagName: 'div',

		ui: {
			addParticipantForm: '.oca-spreedme-add-person',
			addParticipantInput: '.add-person-input',
			participantList: '.participantWithList'
		},

		regions: {
			participantList: '@ui.participantList'
		},

		template: Handlebars.compile(TEMPLATE),

		initialize: function(options) {
			this.room = options.room;
			this.collection = options.collection;
			this._participantListView = new OCA.SpreedMe.Views.ParticipantListView({ collection: options.collection });

			// In Marionette 3.0 the view is not rendered automatically if
			// needed when showing a child view, so it must be rendered
			// explicitly to ensure that the DOM element in which the child view
			// will be appended exists.
			this.render();
			this.showChildView('participantList', this._participantListView, { replaceElement: true } );
		},

		/**
		 * @param {OCA.SpreedMe.Models.Room} room
		 * @returns {Array}
		 */
		setRoom: function(room) {
			this.stopListening(this.room, 'change:participantType');

			this.room = room;
			this.collection.setRoom(room);

			this._updateAddParticipantFormVisibility();
			this.listenTo(this.room, 'change:participantType', this._updateAddParticipantFormVisibility);
		},

		onRender: function() {
			this._updateAddParticipantFormVisibility();
			this.initAddParticipantSelector();
		},

		/**
		 * Shows or hides the "Add participant" form based on the role of the
		 * current user in the room.
		 *
		 * The form is shown if the current user is the owner or a moderator of
		 * the room; otherwise the form is hidden.
		 */
		_updateAddParticipantFormVisibility: function() {
			if (!this.room ||
					(this.room.get('participantType') !== OCA.SpreedMe.app.OWNER &&
					this.room.get('participantType') !== OCA.SpreedMe.app.MODERATOR)) {
				this.ui.addParticipantForm.hide();
			} else {
				this.ui.addParticipantForm.show();
			}
		},

		initAddParticipantSelector: function() {
			this.ui.addParticipantInput.select2({
				ajax: {
					url: OC.linkToOCS('core/autocomplete', 2) + 'get',
					dataType: 'json',
					quietMillis: 100,
					data: function (term) {
						return {
							format: 'json',
							search: term,
							itemType: 'call',
							itemId: this.room.get('token')
						};
					}.bind(this),
					results: function (response) {
						// TODO improve error case
						if (_.isUndefined(response.ocs.data)) {
							return;
						}

						var results = [],
							participants = this.room.get('participants');

						response.ocs.data.forEach(function(suggestion) {
							if (participants.hasOwnProperty(suggestion.id)) {
								return;
							}

							results.push({
								id: suggestion.id,
								displayName: suggestion.label,
								type: 'user'
							});
						});

						return {
							results: results,
							more: false
						};
					}.bind(this)
				},
				initSelection: function (element, callback) {
					callback({id: element.val()});
				},
				formatResult: function (element) {
					return '<span><div class="avatar" data-user="' + escapeHTML(element.id) + '" data-user-display-name="' + escapeHTML(element.displayName) + '"></div>' + escapeHTML(element.displayName) + '</span>';
				},
				formatSelection: function () {
					return '<span class="select2-default" style="padding-left: 0;">' + t('spreed', 'Add participant …') + '</span>';
				}
			});
			this.ui.addParticipantInput.on('change', function(e) {
				var token = this.room.get('token');
				var participant = e.val;
				OCA.SpreedMe.app.addParticipantToRoom(token, participant);

				// Clear the input to be able to select the last participant
				// again (for example, in a different room), as select2 only
				// triggers the change event when the selected item is different
				// than the input value.
				this.ui.addParticipantInput.val('');

				$('.select2-drop').find('.avatar').each(function () {
					var element = $(this);
					if (element.data('user-display-name')) {
						element.avatar(element.data('user'), 32, undefined, false, undefined, element.data('user-display-name'));
					} else {
						element.avatar(element.data('user'), 32);
					}
				});
			}.bind(this));
			this.ui.addParticipantInput.on('click', function() {
				$('.select2-drop').find('.avatar').each(function () {
					var element = $(this);
					if (element.data('user-display-name')) {
						element.avatar(element.data('user'), 32, undefined, false, undefined, element.data('user-display-name'));
					} else {
						element.avatar(element.data('user'), 32);
					}
				});
			});

			this.ui.addParticipantInput.on('select2-loaded', function() {
				$('.select2-drop').find('.avatar').each(function () {
					var element = $(this);
					if (element.data('user-display-name')) {
						element.avatar(element.data('user'), 32, undefined, false, undefined, element.data('user-display-name'));
					} else {
						element.avatar(element.data('user'), 32);
					}
				});
			});
		}

	});

})(OC, OCA, Marionette, Handlebars);

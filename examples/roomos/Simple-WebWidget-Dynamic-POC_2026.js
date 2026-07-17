/********************************************************
 Copyright (c) 2026 Cisco and/or its affiliates.
 This software is licensed to you under the terms of the Cisco Sample
 Code License, Version 1.1 (the "License"). You may obtain a copy of the
 License at https://developer.cisco.com/docs/licenses
 All use of the material herein must be in accordance with the terms of
 the License. All rights not expressly granted by the License are
 reserved. Unless required by applicable law or agreed to separately
 in writing, software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 express or implied.
 *********************************************************/

/**
 * Author(s):               Robert (Bobby) McGonigle Jr
 *                          Technical Marketing Engineer
 *                          Cisco Systems Inc.
 *
 * Consulting Engineer(s):  None specified
 *
 * Date Created:            July 17, 2026
 * Revised:                 July 17, 2026
 * Version:                 0.1.0
 *
 * Description:             Demonstrates a dynamic RoomOS Simple WebWidget.
 *
 * Documentation:           https://ctg-tme.github.io/Simple-WebWidget/
 *
 * Software Platforms:      RoomOS Only
 */

/**
 * Simple WebWidget Dynamic POC
 *
 * A small, readable example of:
 *   1. Reading codec values.
 *   2. Building a Simple WebWidget URL.
 *   3. Saving the WebWidget.
 *   4. Subscribing to changes and saving again.
 *   5. Showing and hiding info3 on a timer.
 */

import xapi from 'xapi';

/** WebWidget identity and destination. */
const SIMPLE_WEB_WIDGET_URL = 'https://ctg-tme.github.io/Simple-WebWidget/';
const WEB_WIDGET_ICON_URL = 'https://avatars.githubusercontent.com/u/159071680?s=200&v=4';
const WEB_WIDGET_NAME = 'Simple WebWidget Dynamic POC';
const WEB_WIDGET_PANEL_ID = 'simpleWebWidgetDynamicPoc';

/** Timing and prompt settings used by the demo. */
const WEB_WIDGET_REFRESH_INTERVAL = 0;
const DYNAMIC_INFO_INTERVAL_MS = 5000;
const OVERWRITE_PROMPT_ID = 'simpleWebWidgetDynamicPocOverwrite';

/**
 * xLaunch is captured in SimpleWebWidget analytics; it is the only URL value
 * captured. It is intended for apps that cross-launch into SimpleWebWidget.
 * Only put your app name here if you are willing to share it with the developer.
 * Set it to '' to leave xLaunch out of the URL.
 */
const WEB_WIDGET_X_LAUNCH = 'SWW_POC_Macro';

/** Runtime values displayed in the WebWidget. */
let themeName = 'EveningFjord';
let codecName = 'Unknown codec';
let productPlatform = 'RoomOS device';
let peopleCount = 0;
let audioVolume = 'Unknown';
let dramStatus = 'Unknown';
let decemberThemeEnabled = null;
let dynamicInfoVisible = false;
let dynamicLoopTimer = null;
let macroDisabled = false;

/** Starts the read, save, subscribe, and dynamic-loop lifecycle. */
async function init() {
	await readInitialValues();

	if (!await replaceExistingWebWidgetIfNeeded()) {
		return;
	}

	await saveWebWidget('initialization');
	subscribeToChanges();

	dynamicLoopTimer = setInterval(() => {
		if (macroDisabled) {
			return;
		}

		dynamicInfoVisible = !dynamicInfoVisible;
		updateWebWidget('dynamic info3 loop');
	}, DYNAMIC_INFO_INTERVAL_MS);

	console.info('[Simple WebWidget POC] Started');
}

/** Reads every value used to build the initial URL. */
async function readInitialValues() {
	themeName = text(await xapi.Config.UserInterface.Theme.Name.get()) || themeName;
	codecName = text(await xapi.Status.SystemUnit.BroadcastName.get()) || codecName;
	productPlatform = text(await xapi.Status.SystemUnit.ProductPlatform.get()) || productPlatform;
	peopleCount = peopleCountValue(await xapi.Status.RoomAnalytics.PeopleCount.Current.get());
	audioVolume = text(await xapi.Status.Audio.Volume.get()) || audioVolume;
	dramStatus = text(await xapi.Status.SystemUnit.Hardware.DRAM.get()) || dramStatus;

	try {
		decemberThemeEnabled = booleanValue(
			await xapi.Config.UserInterface.DecemberThemeBeta.get(),
			null
		);
	} catch (error) {
		console.warn('[Simple WebWidget POC] DecemberThemeBeta is unavailable');
		decemberThemeEnabled = null;
	}
}

/** Subscribes to every status/configuration value used by the URL. */
function subscribeToChanges() {
	xapi.Config.UserInterface.Theme.Name.on(value => {
		themeName = text(value) || themeName;
		updateWebWidget('theme changed');
	});

	xapi.Config.UserInterface.DecemberThemeBeta.on(value => {
		decemberThemeEnabled = booleanValue(value, decemberThemeEnabled);
		updateWebWidget('DecemberThemeBeta changed');
	});

	xapi.Status.SystemUnit.BroadcastName.on(value => {
		codecName = text(value) || codecName;
		updateWebWidget('broadcast name changed');
	});

	xapi.Status.SystemUnit.ProductPlatform.on(value => {
		productPlatform = text(value) || productPlatform;
		updateWebWidget('platform changed');
	});

	xapi.Status.RoomAnalytics.PeopleCount.Current.on(value => {
		peopleCount = peopleCountValue(value);
		updateWebWidget('people count changed');
	});

	// Status.Audio.Volume is the status value. Level is used with the Set command.
	xapi.Status.Audio.Volume.on(value => {
		audioVolume = text(value) || audioVolume;
		updateWebWidget('audio volume changed');
	});

	xapi.Status.SystemUnit.Hardware.DRAM.on(value => {
		dramStatus = text(value) || dramStatus;
		updateWebWidget('DRAM changed');
	});
}

/** Saves the latest values after a subscription event. */
function updateWebWidget(reason) {
	if (macroDisabled) {
		return;
	}

	saveWebWidget(reason).catch(error => {
		console.warn('[Simple WebWidget POC] WebWidget update failed', errorText(error));
	});
}

/** Saves the current URL and handles a WebWidget conflict if needed. */
async function saveWebWidget(reason) {
	const url = buildWebWidgetUrl();
	/** Payload expected by WebWidget.Save. */
	const widget = {
		Name: WEB_WIDGET_NAME,
		PanelId: WEB_WIDGET_PANEL_ID,
		RefreshInterval: WEB_WIDGET_REFRESH_INTERVAL,
		URL: url
	};

	try {
		await xapi.Command.UserInterface.Extensions.WebWidget.Save(widget);
	} catch (error) {
		if (!isOnlyOneWebWidgetError(error)) {
			throw error;
		}

		if (!await replaceExistingWebWidgetIfNeeded()) {
			return;
		}

		await xapi.Command.UserInterface.Extensions.WebWidget.Save(widget);
	}

	console.info('[Simple WebWidget POC] WebWidget saved', {
		Reason: reason,
		Info3Visible: dynamicInfoVisible
	});
}

/** Prompts before removing another WebWidget. */
async function replaceExistingWebWidgetIfNeeded() {
	const existing = await findExistingWebWidget();

	if (!existing || existing.panelId === WEB_WIDGET_PANEL_ID) {
		return true;
	}

	if (!existing.panelId) {
		await showMessage(
			'Simple WebWidget POC disabled',
			'An existing WebWidget was found, but RoomOS did not provide its PanelId.'
		);
		disableMacro('Existing WebWidget PanelId was unavailable');
		return false;
	}

	const overwrite = await askToOverwrite(existing.name);
	if (!overwrite) {
		disableMacro('User canceled the existing WebWidget overwrite prompt');
		return false;
	}

	await xapi.Command.UserInterface.Extensions.WebWidget.Remove({
		PanelId: existing.panelId
	});

	console.info('[Simple WebWidget POC] Existing WebWidget removed', {
		PanelId: existing.panelId
	});
	return true;
}

/** Returns the first WebWidget reported by Extensions.List. */
async function findExistingWebWidget() {
	const response = await xapi.Command.UserInterface.Extensions.List({
		ActivityType: 'WebWidget'
	});

	// RoomOS returns the WebWidget entries in Extensions.Panel.
	const panels = response && response.Extensions && response.Extensions.Panel;
	const panelList = Array.isArray(panels) ? panels : panels ? [panels] : [];

	for (const panel of panelList) {
		const activityType = text(panel.ActivityType).toLowerCase();
		if (!activityType || activityType === 'webwidget') {
			return {
				panelId: panel.PanelId || panel.PanelID || panel.id || '',
				name: panel.Name || 'WebWidget'
			};
		}
	}

	return null;
}

/** Resolves true for Overwrite and false for Cancel. */
function askToOverwrite(existingName) {
	const message = existingName
		? `A WebWidget named "${existingName}" already exists. Overwrite it with this POC?`
		: 'A WebWidget already exists. Overwrite it with this POC?';

	return new Promise(async resolve => {
		const responseNode = xapi.Event.UserInterface.Message.Prompt.Response;
		let finished = false;

		const finish = answer => {
			if (finished) {
				return;
			}

			finished = true;
			responseNode.off(handleResponse);
			xapi.Command.UserInterface.Message.Prompt.Clear({
				FeedbackId: OVERWRITE_PROMPT_ID
			}).catch(() => {});
			resolve(answer);
		};

		const handleResponse = event => {
			if (!event || event.FeedbackId !== OVERWRITE_PROMPT_ID) {
				return;
			}

			const option = event.OptionId || event.Option;
			finish(String(option) === '1');
		};

		responseNode.on(handleResponse);

		try {
			await xapi.Command.UserInterface.Message.Prompt.Display({
				Title: 'WebWidget Already Configured',
				Text: message,
				FeedbackId: OVERWRITE_PROMPT_ID,
				'Option.1': 'Overwrite',
				'Option.2': 'Cancel',
				Duration: 0
			});
		} catch (error) {
			finish(false);
		}
	});
}

/** Displays a short informational prompt. */
async function showMessage(title, message) {
	await xapi.Command.UserInterface.Message.Prompt.Display({
		Title: title,
		Text: message,
		FeedbackId: 'simpleWebWidgetPocMessage',
		Duration: 10
	});
}

/** Stops timers and prevents further saves. */
function disableMacro(reason) {
	macroDisabled = true;

	if (dynamicLoopTimer) {
		clearInterval(dynamicLoopTimer);
		dynamicLoopTimer = null;
	}

	console.info('[Simple WebWidget POC] Macro disabled', { Reason: reason });
}

/** Builds the hash URL consumed by the Simple WebWidget app. */
function buildWebWidgetUrl() {
	const params = [];

	addParam(params, 'theme', themeName || 'EveningFjord');
	addParam(params, 'heading', 'Simple WebWidget Dynamic POC');
	addParam(params, 'iconUrl', WEB_WIDGET_ICON_URL);
	addParam(params, 'info1', `Codec: ${codecName}\\nPlatform: ${productPlatform}\\nTheme: ${themeName}`);
	addParam(params, 'info2', `People count: ${peopleCount}\\nAudio volume: ${audioVolume}\\nDRAM: ${dramStatus}`);

	if (dynamicInfoVisible) {
		addParam(params, 'info3', 'Dynamic block:\\nHide and Show information on the fly');
	}

	if (typeof WEB_WIDGET_X_LAUNCH === 'string' && WEB_WIDGET_X_LAUNCH.trim()) {
		addParam(params, 'xLaunch', WEB_WIDGET_X_LAUNCH.trim());
	}

	// The WebApp handles winter styling automatically unless RoomOS says Off.
	if (decemberThemeEnabled === false) {
		addParam(params, 'winter', 'false');
	}

	addParam(params, 'hideSettings', 'true');

	return `${SIMPLE_WEB_WIDGET_URL}#${params
		.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
		.join('&')}`;
}

/** Adds a non-empty key/value pair to the URL. */
function addParam(params, key, value) {
	if (value !== undefined && value !== null && value !== '') {
		params.push([key, String(value)]);
	}
}

/** Converts PeopleCount to a non-negative number. */
function peopleCountValue(value) {
	const number = Number(value && value.Value !== undefined ? value.Value : value);
	return Number.isFinite(number) && number > 0 ? number : 0;
}

/** Converts RoomOS boolean values to true/false. */
function booleanValue(value, fallback) {
	if (typeof value === 'boolean') {
		return value;
	}

	const normalized = text(value).toLowerCase();
	if (['true', 'on', 'enabled', 'yes', '1'].includes(normalized)) {
		return true;
	}
	if (['false', 'off', 'disabled', 'no', '0'].includes(normalized)) {
		return false;
	}

	return fallback;
}

/** Converts scalar or Value-wrapped xAPI data to text. */
function text(value) {
	if (value && typeof value === 'object' && value.Value !== undefined) {
		return String(value.Value);
	}

	return value === undefined || value === null ? '' : String(value);
}

/** Detects RoomOS's single-WebWidget conflict. */
function isOnlyOneWebWidgetError(error) {
	return errorText(error).toLowerCase().includes('only one web widget');
}

/** Returns a readable error message. */
function errorText(error) {
	return error && error.message ? error.message : String(error);
}

init().catch(error => {
	console.error('[Simple WebWidget POC] Initialization failed', errorText(error));
});

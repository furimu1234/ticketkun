import type { Message } from 'discord.js';

export const editPanelMap = () => {
	const byPanelIdMap = new Map<string, Message>();
	const editPanelIdToPanelId = new Map<string, string>();
	const byEditPanelIdMap = new Map<string, Message>();
	const byPreviewMessageIdMap = new Map<string, Message>();

	const getByPanelId = (panelId: string) => {
		return byPanelIdMap.get(panelId);
	};

	const setByPanelId = (panelId: string, message: Message) => {
		byPanelIdMap.set(panelId, message);
	};

	const getbyEditPanelId = (panelId: string) => {
		return byEditPanelIdMap.get(panelId);
	};

	const setbyEditPanelId = (panelId: string, message: Message) => {
		byEditPanelIdMap.set(panelId, message);
	};

	const getbyPreviewMessageId = (panelId: string) => {
		return byPreviewMessageIdMap.get(panelId);
	};

	const setbyPreviewMessageId = (panelId: string, message: Message) => {
		byPreviewMessageIdMap.set(panelId, message);
	};
	const getEditPanelIdToPanelId = (editPanelId: string) => {
		return editPanelIdToPanelId.get(editPanelId);
	};

	const setEditPanelIdToPanelId = (editPanelId: string, panelId: string) => {
		editPanelIdToPanelId.set(editPanelId, panelId);
	};

	return {
		getByPanelId,
		getbyEditPanelId,
		setByPanelId,
		setbyEditPanelId,
		getbyPreviewMessageId,
		setbyPreviewMessageId,
		getEditPanelIdToPanelId,
		setEditPanelIdToPanelId,
	};
};

export const editPanelStore = editPanelMap();

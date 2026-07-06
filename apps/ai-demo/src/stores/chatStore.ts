import { create } from "zustand";
import type { Message } from "../types/index.ts";

export interface Conversation {
	id: string;
	title: string;
	messages: Message[];
	createdAt: Date;
	updatedAt: Date;
}

interface SerializedMessage {
	id?: string;
	role: "user" | "assistant" | "system";
	content: string;
	timestamp?: string;
}

interface SerializedConversation {
	id: string;
	title: string;
	messages: SerializedMessage[];
	createdAt: string;
	updatedAt: string;
}

interface ChatHistoryState {
	conversations: Conversation[];
	currentConversationId: string | null;
	messages: Message[];
	isLoading: boolean;
	error: string | null;

	createConversation: () => string;
	switchConversation: (id: string) => void;
	deleteConversation: (id: string) => void;
	renameConversation: (id: string, title: string) => void;

	addMessage: (message: Message) => void;
	clearMessages: () => void;
	setLoading: (loading: boolean) => void;
	setError: (error: string | null) => void;
}

const generateId = () =>
	crypto.randomUUID?.() ?? Math.random().toString(36).substring(2, 15);

function createWelcomeMessage(): Message {
	return {
		id: generateId(),
		role: "assistant",
		content: "你好！我是 AI 助手，有什么可以帮助你的吗？",
		timestamp: new Date(),
	};
}

function deserializeConversation(data: SerializedConversation): Conversation {
	return {
		...data,
		createdAt: new Date(data.createdAt),
		updatedAt: new Date(data.updatedAt),
		messages: data.messages.map((m) => ({
			...m,
			id: m.id ?? generateId(),
			timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
		})),
	};
}

function loadConversations(): Conversation[] {
	try {
		const data = localStorage.getItem("chat_conversations");
		if (!data) return [];
		const parsed: SerializedConversation[] = JSON.parse(data);
		return parsed.map(deserializeConversation);
	} catch {
		return [];
	}
}

function saveConversations(conversations: Conversation[]): void {
	localStorage.setItem("chat_conversations", JSON.stringify(conversations));
}

function createNewConversation(title = "新对话"): Conversation {
	return {
		id: generateId(),
		title,
		messages: [createWelcomeMessage()],
		createdAt: new Date(),
		updatedAt: new Date(),
	};
}

export const useChatStore = create<ChatHistoryState>((set) => {
	const savedConversations = loadConversations();

	const initialConversations =
		savedConversations.length > 0
			? savedConversations
			: [createNewConversation()];

	const currentId = initialConversations[0].id;

	return {
		conversations: initialConversations,
		currentConversationId: currentId,
		messages: initialConversations[0].messages,
		isLoading: false,
		error: null,

		createConversation: () => {
			const newConversation = createNewConversation();
			set((state) => {
				const updated = [newConversation, ...state.conversations];
				saveConversations(updated);
				return {
					conversations: updated,
					currentConversationId: newConversation.id,
					messages: newConversation.messages,
					error: null,
				};
			});
			return newConversation.id;
		},

		switchConversation: (id: string) => {
			set((state) => {
				const conversation = state.conversations.find((c) => c.id === id);
				if (!conversation) return state;
				return {
					currentConversationId: id,
					messages: conversation.messages,
					error: null,
				};
			});
		},

		deleteConversation: (id: string) => {
			set((state) => {
				const filtered = state.conversations.filter((c) => c.id !== id);

				let newCurrentId = state.currentConversationId;
				let newMessages = state.messages;

				if (state.currentConversationId === id) {
					if (filtered.length > 0) {
						newCurrentId = filtered[0].id;
						newMessages = filtered[0].messages;
					} else {
						const defaultConv = createNewConversation();
						filtered.push(defaultConv);
						newCurrentId = defaultConv.id;
						newMessages = defaultConv.messages;
					}
				}

				saveConversations(filtered);
				return {
					conversations: filtered,
					currentConversationId: newCurrentId,
					messages: newMessages,
				};
			});
		},

		renameConversation: (id: string, title: string) => {
			set((state) => {
				const updated = state.conversations.map((c) =>
					c.id === id ? { ...c, title, updatedAt: new Date() } : c,
				);
				saveConversations(updated);
				return { conversations: updated };
			});
		},

		addMessage: (message: Message) => {
			const newMessage: Message = {
				...message,
				id: message.id ?? generateId(),
				timestamp: new Date(),
			};
			set((state) => {
				const newMessages = [...state.messages, newMessage];
				const updated = state.conversations.map((c) => {
					if (c.id === state.currentConversationId) {
						let title = c.title;
						if (title === "新对话" && message.role === "user") {
							title =
								message.content.substring(0, 20) +
								(message.content.length > 20 ? "..." : "");
						}
						return {
							...c,
							title,
							messages: newMessages,
							updatedAt: new Date(),
						};
					}
					return c;
				});

				saveConversations(updated);
				return { messages: newMessages, conversations: updated };
			});
		},

		clearMessages: () => {
			const welcome = createWelcomeMessage();
			set((state) => {
				const updated = state.conversations.map((c) => {
					if (c.id === state.currentConversationId) {
						return { ...c, messages: [welcome], updatedAt: new Date() };
					}
					return c;
				});
				saveConversations(updated);
				return { messages: [welcome], conversations: updated, error: null };
			});
		},

		setLoading: (loading: boolean) => set({ isLoading: loading }),
		setError: (error: string | null) => set({ error }),
	};
});

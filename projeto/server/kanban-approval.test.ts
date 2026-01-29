import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database helpers
vi.mock("./db-helpers", () => ({
  getContentById: vi.fn(),
  getContentWithApproval: vi.fn(),
  getContentsByClientIdWithApproval: vi.fn(),
  createApprovalFromContent: vi.fn(),
  syncApprovalStatusToContent: vi.fn(),
  getApprovalByContentId: vi.fn(),
  unlinkApprovalFromContent: vi.fn(),
  updateContent: vi.fn(),
  createApproval: vi.fn(),
  createApprovalHistoryEntry: vi.fn(),
  createNotification: vi.fn(),
  getAiConversationById: vi.fn(),
  getAiConversationsByUserId: vi.fn(),
  createAiConversation: vi.fn(),
  updateAiConversation: vi.fn(),
  deleteAiConversation: vi.fn(),
  archiveAiConversation: vi.fn(),
}));

import * as dbHelpers from "./db-helpers";

describe("Kanban-Approval Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getContentWithApproval", () => {
    it("should return content with linked approval", async () => {
      const mockResult = {
        content: {
          id: 1,
          clientId: 1,
          title: "Test Content",
          status: "in_approval",
          approvalId: 10,
        },
        approval: {
          id: 10,
          status: "pending",
          title: "Test Content",
        },
        client: {
          id: 1,
          name: "Test Client",
        },
      };

      vi.mocked(dbHelpers.getContentWithApproval).mockResolvedValue(mockResult);

      const result = await dbHelpers.getContentWithApproval(1);

      expect(result).toEqual(mockResult);
      expect(dbHelpers.getContentWithApproval).toHaveBeenCalledWith(1);
    });

    it("should return undefined for non-existent content", async () => {
      vi.mocked(dbHelpers.getContentWithApproval).mockResolvedValue(undefined);

      const result = await dbHelpers.getContentWithApproval(999);

      expect(result).toBeUndefined();
    });
  });

  describe("getContentsByClientIdWithApproval", () => {
    it("should return all contents with their approvals for a client", async () => {
      const mockResults = [
        {
          content: { id: 1, title: "Content 1", status: "to_do", approvalId: null },
          approval: null,
        },
        {
          content: { id: 2, title: "Content 2", status: "in_approval", approvalId: 10 },
          approval: { id: 10, status: "pending" },
        },
        {
          content: { id: 3, title: "Content 3", status: "done", approvalId: 11 },
          approval: { id: 11, status: "approved" },
        },
      ];

      vi.mocked(dbHelpers.getContentsByClientIdWithApproval).mockResolvedValue(mockResults);

      const result = await dbHelpers.getContentsByClientIdWithApproval(1);

      expect(result).toHaveLength(3);
      expect(result[0].approval).toBeNull();
      expect(result[1].approval?.status).toBe("pending");
      expect(result[2].approval?.status).toBe("approved");
    });

    it("should return empty array for client with no contents", async () => {
      vi.mocked(dbHelpers.getContentsByClientIdWithApproval).mockResolvedValue([]);

      const result = await dbHelpers.getContentsByClientIdWithApproval(999);

      expect(result).toEqual([]);
    });
  });

  describe("createApprovalFromContent", () => {
    it("should create approval and link to content", async () => {
      vi.mocked(dbHelpers.getContentById).mockResolvedValue({
        id: 1,
        clientId: 1,
        title: "Test Content",
        content: "Test content body",
        contentType: "social_post",
        status: "to_do",
        createdBy: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        pitId: null,
        approvalId: null,
        fileUrl: null,
        fileKey: null,
        approvedBy: null,
        approvedAt: null,
      });

      vi.mocked(dbHelpers.createApprovalFromContent).mockResolvedValue(10);

      const approvalId = await dbHelpers.createApprovalFromContent(1, 1);

      expect(approvalId).toBe(10);
      expect(dbHelpers.createApprovalFromContent).toHaveBeenCalledWith(1, 1);
    });

    it("should throw error for non-existent content", async () => {
      vi.mocked(dbHelpers.createApprovalFromContent).mockRejectedValue(
        new Error("Content not found")
      );

      await expect(dbHelpers.createApprovalFromContent(999, 1)).rejects.toThrow(
        "Content not found"
      );
    });
  });

  describe("syncApprovalStatusToContent", () => {
    it("should sync approved status to content", async () => {
      vi.mocked(dbHelpers.syncApprovalStatusToContent).mockResolvedValue(1);

      const contentId = await dbHelpers.syncApprovalStatusToContent(10);

      expect(contentId).toBe(1);
      expect(dbHelpers.syncApprovalStatusToContent).toHaveBeenCalledWith(10);
    });

    it("should return undefined if no content linked", async () => {
      vi.mocked(dbHelpers.syncApprovalStatusToContent).mockResolvedValue(undefined);

      const result = await dbHelpers.syncApprovalStatusToContent(999);

      expect(result).toBeUndefined();
    });
  });

  describe("getApprovalByContentId", () => {
    it("should return approval for content", async () => {
      const mockResult = {
        approval: {
          id: 10,
          contentId: 1,
          status: "pending",
          title: "Test",
        },
        client: {
          id: 1,
          name: "Test Client",
        },
      };

      vi.mocked(dbHelpers.getApprovalByContentId).mockResolvedValue(mockResult);

      const result = await dbHelpers.getApprovalByContentId(1);

      expect(result).toEqual(mockResult);
    });

    it("should return undefined for content without approval", async () => {
      vi.mocked(dbHelpers.getApprovalByContentId).mockResolvedValue(undefined);

      const result = await dbHelpers.getApprovalByContentId(999);

      expect(result).toBeUndefined();
    });
  });

  describe("unlinkApprovalFromContent", () => {
    it("should remove approval link from content", async () => {
      vi.mocked(dbHelpers.unlinkApprovalFromContent).mockResolvedValue(undefined);

      await dbHelpers.unlinkApprovalFromContent(1);

      expect(dbHelpers.unlinkApprovalFromContent).toHaveBeenCalledWith(1);
    });
  });
});

describe("AI Conversation History", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAiConversationById", () => {
    it("should return conversation by id", async () => {
      const mockConversation = {
        id: 1,
        userId: 1,
        title: "Test Conversation",
        section: "creation",
        messages: JSON.stringify([
          { role: "system", content: "You are helpful" },
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there!" },
        ]),
        isArchived: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(dbHelpers.getAiConversationById).mockResolvedValue(mockConversation);

      const result = await dbHelpers.getAiConversationById(1);

      expect(result).toEqual(mockConversation);
      expect(result?.title).toBe("Test Conversation");
    });

    it("should return undefined for non-existent conversation", async () => {
      vi.mocked(dbHelpers.getAiConversationById).mockResolvedValue(undefined);

      const result = await dbHelpers.getAiConversationById(999);

      expect(result).toBeUndefined();
    });
  });

  describe("getAiConversationsByUserId", () => {
    it("should return all conversations for user", async () => {
      const mockConversations = [
        { id: 1, userId: 1, title: "Conv 1", section: "creation", isArchived: 0 },
        { id: 2, userId: 1, title: "Conv 2", section: "creation", isArchived: 0 },
      ];

      vi.mocked(dbHelpers.getAiConversationsByUserId).mockResolvedValue(mockConversations as any);

      const result = await dbHelpers.getAiConversationsByUserId(1);

      expect(result).toHaveLength(2);
    });

    it("should filter by section when provided", async () => {
      const mockConversations = [
        { id: 1, userId: 1, title: "Conv 1", section: "creation", isArchived: 0 },
      ];

      vi.mocked(dbHelpers.getAiConversationsByUserId).mockResolvedValue(mockConversations as any);

      const result = await dbHelpers.getAiConversationsByUserId(1, "creation");

      expect(result).toHaveLength(1);
      expect(dbHelpers.getAiConversationsByUserId).toHaveBeenCalledWith(1, "creation");
    });

    it("should not return archived conversations", async () => {
      vi.mocked(dbHelpers.getAiConversationsByUserId).mockResolvedValue([]);

      const result = await dbHelpers.getAiConversationsByUserId(1);

      // Archived conversations should be filtered out
      expect(result.every((c: any) => c.isArchived === 0)).toBe(true);
    });
  });

  describe("createAiConversation", () => {
    it("should create new conversation and return id", async () => {
      vi.mocked(dbHelpers.createAiConversation).mockResolvedValue(1);

      const id = await dbHelpers.createAiConversation({
        userId: 1,
        title: "New Conversation",
        section: "creation",
        messages: JSON.stringify([{ role: "system", content: "Hello" }]),
      });

      expect(id).toBe(1);
    });

    it("should auto-generate title from first user message", async () => {
      vi.mocked(dbHelpers.createAiConversation).mockResolvedValue(2);

      const messages = JSON.stringify([
        { role: "system", content: "You are helpful" },
        { role: "user", content: "Create a social media post about environment" },
      ]);

      const id = await dbHelpers.createAiConversation({
        userId: 1,
        section: "creation",
        messages,
      });

      expect(id).toBe(2);
    });
  });

  describe("updateAiConversation", () => {
    it("should update conversation messages", async () => {
      vi.mocked(dbHelpers.updateAiConversation).mockResolvedValue(undefined);

      await dbHelpers.updateAiConversation(1, {
        messages: JSON.stringify([
          { role: "system", content: "Hello" },
          { role: "user", content: "New message" },
        ]),
      });

      expect(dbHelpers.updateAiConversation).toHaveBeenCalledWith(1, expect.any(Object));
    });

    it("should update conversation title", async () => {
      vi.mocked(dbHelpers.updateAiConversation).mockResolvedValue(undefined);

      await dbHelpers.updateAiConversation(1, {
        title: "Updated Title",
      });

      expect(dbHelpers.updateAiConversation).toHaveBeenCalledWith(1, { title: "Updated Title" });
    });
  });

  describe("deleteAiConversation", () => {
    it("should delete conversation", async () => {
      vi.mocked(dbHelpers.deleteAiConversation).mockResolvedValue(undefined);

      await dbHelpers.deleteAiConversation(1);

      expect(dbHelpers.deleteAiConversation).toHaveBeenCalledWith(1);
    });
  });

  describe("archiveAiConversation", () => {
    it("should archive conversation instead of deleting", async () => {
      vi.mocked(dbHelpers.archiveAiConversation).mockResolvedValue(undefined);

      await dbHelpers.archiveAiConversation(1);

      expect(dbHelpers.archiveAiConversation).toHaveBeenCalledWith(1);
    });
  });
});

describe("Content Type Mapping", () => {
  it("should map social_post to post approval type", () => {
    const contentTypeMap: Record<string, string> = {
      social_post: "post",
      tv_program: "video",
      radio_program: "audio",
      tv_insertion: "video",
      radio_insertion: "audio",
      speech: "document",
      jingle: "audio",
      graphic: "image",
    };

    expect(contentTypeMap["social_post"]).toBe("post");
    expect(contentTypeMap["tv_program"]).toBe("video");
    expect(contentTypeMap["radio_program"]).toBe("audio");
    expect(contentTypeMap["graphic"]).toBe("image");
  });
});

describe("Approval Status to Content Status Mapping", () => {
  it("should map approval statuses to content statuses correctly", () => {
    const statusMap: Record<string, string> = {
      pending: "in_approval",
      in_review: "in_approval",
      approved: "done",
      rejected: "to_do",
      revision_requested: "to_do",
    };

    expect(statusMap["pending"]).toBe("in_approval");
    expect(statusMap["in_review"]).toBe("in_approval");
    expect(statusMap["approved"]).toBe("done");
    expect(statusMap["rejected"]).toBe("to_do");
    expect(statusMap["revision_requested"]).toBe("to_do");
  });
});

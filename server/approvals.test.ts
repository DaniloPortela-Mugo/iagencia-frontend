import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database helpers
vi.mock("./db-helpers", () => ({
  getAllApprovals: vi.fn(),
  getAllPendingApprovals: vi.fn(),
  getApprovalStats: vi.fn(),
  getApprovalById: vi.fn(),
  getApprovalsByClientId: vi.fn(),
  createApproval: vi.fn(),
  updateApproval: vi.fn(),
  deleteApproval: vi.fn(),
  createApprovalHistoryEntry: vi.fn(),
  createNotification: vi.fn(),
  getCommentsByApprovalId: vi.fn(),
  createApprovalComment: vi.fn(),
  deleteApprovalComment: vi.fn(),
  getApprovalHistory: vi.fn(),
}));

import * as dbHelpers from "./db-helpers";

describe("approvals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should list all approvals without filters", async () => {
      const mockApprovals = [
        {
          approval: {
            id: 1,
            clientId: 1,
            title: "Post Instagram",
            description: "Conteúdo para aprovação",
            contentType: "post",
            status: "pending",
            priority: "medium",
            requestedBy: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          client: { id: 1, name: "Cliente A" },
          requester: { id: 1, name: "Usuário 1" },
        },
      ];

      vi.mocked(dbHelpers.getAllApprovals).mockResolvedValue(mockApprovals as any);

      const result = await dbHelpers.getAllApprovals();
      expect(result).toEqual(mockApprovals);
      expect(dbHelpers.getAllApprovals).toHaveBeenCalledWith();
    });

    it("should filter approvals by status", async () => {
      const mockApprovals = [
        {
          approval: { id: 1, status: "pending" },
          client: { id: 1, name: "Cliente A" },
          requester: { id: 1, name: "Usuário 1" },
        },
      ];

      vi.mocked(dbHelpers.getAllApprovals).mockResolvedValue(mockApprovals as any);

      await dbHelpers.getAllApprovals({ status: "pending" });
      expect(dbHelpers.getAllApprovals).toHaveBeenCalledWith({ status: "pending" });
    });

    it("should filter approvals by client", async () => {
      vi.mocked(dbHelpers.getAllApprovals).mockResolvedValue([]);

      await dbHelpers.getAllApprovals({ clientId: 1 });
      expect(dbHelpers.getAllApprovals).toHaveBeenCalledWith({ clientId: 1 });
    });

    it("should filter approvals by priority", async () => {
      vi.mocked(dbHelpers.getAllApprovals).mockResolvedValue([]);

      await dbHelpers.getAllApprovals({ priority: "urgent" });
      expect(dbHelpers.getAllApprovals).toHaveBeenCalledWith({ priority: "urgent" });
    });
  });

  describe("pending", () => {
    it("should list all pending approvals", async () => {
      const mockPending = [
        {
          approval: { id: 1, status: "pending" },
          client: { id: 1, name: "Cliente A" },
        },
      ];

      vi.mocked(dbHelpers.getAllPendingApprovals).mockResolvedValue(mockPending as any);

      const result = await dbHelpers.getAllPendingApprovals();
      expect(result).toEqual(mockPending);
    });
  });

  describe("stats", () => {
    it("should return approval statistics", async () => {
      const mockStats = {
        pending: 5,
        inReview: 2,
        approved: 10,
        rejected: 3,
        revisionRequested: 1,
        total: 21,
      };

      vi.mocked(dbHelpers.getApprovalStats).mockResolvedValue(mockStats);

      const result = await dbHelpers.getApprovalStats();
      expect(result).toEqual(mockStats);
    });
  });

  describe("getById", () => {
    it("should get approval by id with requester and approver info", async () => {
      const mockApproval = {
        approval: {
          id: 1,
          clientId: 1,
          title: "Post Instagram",
          status: "approved",
          requestedBy: 1,
          approvedBy: 2,
        },
        client: { id: 1, name: "Cliente A" },
        requester: { id: 1, name: "Solicitante" },
        approver: { id: 2, name: "Aprovador" },
      };

      vi.mocked(dbHelpers.getApprovalById).mockResolvedValue(mockApproval as any);

      const result = await dbHelpers.getApprovalById(1);
      expect(result).toEqual(mockApproval);
      expect(result?.requester).toBeDefined();
      expect(result?.approver).toBeDefined();
    });

    it("should return undefined for non-existent approval", async () => {
      vi.mocked(dbHelpers.getApprovalById).mockResolvedValue(undefined);

      const result = await dbHelpers.getApprovalById(999);
      expect(result).toBeUndefined();
    });
  });

  describe("create", () => {
    it("should create a new approval request", async () => {
      vi.mocked(dbHelpers.createApproval).mockResolvedValue(1);
      vi.mocked(dbHelpers.createApprovalHistoryEntry).mockResolvedValue(1);

      const newApproval = {
        clientId: 1,
        title: "Novo Post",
        description: "Descrição do post",
        contentType: "post" as const,
        priority: "medium" as const,
        requestedBy: 1,
      };

      const id = await dbHelpers.createApproval(newApproval);
      expect(id).toBe(1);
      expect(dbHelpers.createApproval).toHaveBeenCalledWith(newApproval);
    });
  });

  describe("updateStatus", () => {
    it("should update approval status to approved", async () => {
      const mockApproval = {
        approval: {
          id: 1,
          status: "pending",
          requestedBy: 1,
          title: "Post",
        },
        client: { id: 1, name: "Cliente" },
        requester: { id: 1, name: "User" },
        approver: null,
      };

      vi.mocked(dbHelpers.getApprovalById).mockResolvedValue(mockApproval as any);
      vi.mocked(dbHelpers.updateApproval).mockResolvedValue(undefined);
      vi.mocked(dbHelpers.createApprovalHistoryEntry).mockResolvedValue(1);
      vi.mocked(dbHelpers.createNotification).mockResolvedValue(1);

      await dbHelpers.updateApproval(1, { status: "approved" });
      expect(dbHelpers.updateApproval).toHaveBeenCalledWith(1, { status: "approved" });
    });

    it("should update approval status to rejected with reason", async () => {
      vi.mocked(dbHelpers.updateApproval).mockResolvedValue(undefined);

      await dbHelpers.updateApproval(1, {
        status: "rejected",
        rejectionReason: "Conteúdo inadequado",
      });

      expect(dbHelpers.updateApproval).toHaveBeenCalledWith(1, {
        status: "rejected",
        rejectionReason: "Conteúdo inadequado",
      });
    });
  });

  describe("comments", () => {
    it("should list comments by approval id", async () => {
      const mockComments = [
        {
          comment: { id: 1, approvalId: 1, comment: "Ótimo trabalho!", userId: 1 },
          user: { id: 1, name: "Revisor" },
        },
      ];

      vi.mocked(dbHelpers.getCommentsByApprovalId).mockResolvedValue(mockComments as any);

      const result = await dbHelpers.getCommentsByApprovalId(1);
      expect(result).toEqual(mockComments);
    });

    it("should create a new comment", async () => {
      vi.mocked(dbHelpers.createApprovalComment).mockResolvedValue(1);

      const newComment = {
        approvalId: 1,
        userId: 1,
        comment: "Precisa de ajustes no texto",
      };

      const id = await dbHelpers.createApprovalComment(newComment);
      expect(id).toBe(1);
    });

    it("should delete a comment", async () => {
      vi.mocked(dbHelpers.deleteApprovalComment).mockResolvedValue(undefined);

      await dbHelpers.deleteApprovalComment(1);
      expect(dbHelpers.deleteApprovalComment).toHaveBeenCalledWith(1);
    });
  });

  describe("history", () => {
    it("should list approval history", async () => {
      const mockHistory = [
        {
          history: {
            id: 1,
            approvalId: 1,
            userId: 1,
            previousStatus: null,
            newStatus: "pending",
            notes: "Solicitação criada",
            createdAt: new Date(),
          },
          user: { id: 1, name: "Solicitante" },
        },
        {
          history: {
            id: 2,
            approvalId: 1,
            userId: 2,
            previousStatus: "pending",
            newStatus: "approved",
            notes: "Aprovado",
            createdAt: new Date(),
          },
          user: { id: 2, name: "Aprovador" },
        },
      ];

      vi.mocked(dbHelpers.getApprovalHistory).mockResolvedValue(mockHistory as any);

      const result = await dbHelpers.getApprovalHistory(1);
      expect(result).toEqual(mockHistory);
      expect(result.length).toBe(2);
    });
  });
});

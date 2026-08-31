import { POST as postVote } from "@/app/api/points/[id]/votes/route";
import {
  createPointAs,
  jsonRequest,
  setupPointsTestState,
} from "@/app/api/points/points-test-helpers";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveRequestUserIdMock } = vi.hoisted(() => ({
  resolveRequestUserIdMock: vi.fn(),
}));

vi.mock("@/lib/request-user", () => ({
  resolveRequestUserId: resolveRequestUserIdMock,
}));

describe("point verification votes route", () => {
  beforeEach(() => {
    setupPointsTestState(resolveRequestUserIdMock);
  });

  it("blocks anonymous and self votes", async () => {
    const point = await createPointAs(resolveRequestUserIdMock, "vote-owner", 71);

    resolveRequestUserIdMock.mockResolvedValueOnce(null);
    const anonymous = await postVote(
      jsonRequest(`http://localhost/api/points/${point.id}/votes`, "POST", {
        value: "accurate",
      }),
      { params: Promise.resolve({ id: point.id }) },
    );
    expect(anonymous.status).toBe(401);

    resolveRequestUserIdMock.mockResolvedValueOnce("vote-owner");
    const selfVote = await postVote(
      jsonRequest(`http://localhost/api/points/${point.id}/votes`, "POST", {
        value: "accurate",
      }),
      { params: Promise.resolve({ id: point.id }) },
    );
    expect(selfVote.status).toBe(403);
  });

  it("confirms at five accurate votes and updates one vote per user", async () => {
    const point = await createPointAs(resolveRequestUserIdMock, "vote-owner", 72);

    for (let index = 1; index <= 5; index += 1) {
      resolveRequestUserIdMock.mockResolvedValueOnce(`accurate-voter-${index}`);
      const response = await postVote(
        jsonRequest(`http://localhost/api/points/${point.id}/votes`, "POST", {
          value: "accurate",
        }),
        { params: Promise.resolve({ id: point.id }) },
      );
      expect(response.status).toBe(200);
      if (index === 5) {
        const payload = (await response.json()) as {
          point: { verificationStatus: string; accurateVoteCount: number };
        };
        expect(payload.point.verificationStatus).toBe("verified");
        expect(payload.point.accurateVoteCount).toBe(5);
      }
    }

    resolveRequestUserIdMock.mockResolvedValueOnce("accurate-voter-1");
    const changed = await postVote(
      jsonRequest(`http://localhost/api/points/${point.id}/votes`, "POST", {
        value: "inaccurate",
      }),
      { params: Promise.resolve({ id: point.id }) },
    );
    const changedPayload = (await changed.json()) as {
      point: {
        verificationStatus: string;
        accurateVoteCount: number;
        inaccurateVoteCount: number;
      };
    };
    expect(changedPayload.point.accurateVoteCount).toBe(4);
    expect(changedPayload.point.inaccurateVoteCount).toBe(1);
    expect(changedPayload.point.verificationStatus).toBe("pending");
  });

  it("marks a point inaccurate at three inaccurate votes", async () => {
    const point = await createPointAs(resolveRequestUserIdMock, "vote-owner", 73);

    let lastStatus = "pending";
    for (let index = 1; index <= 3; index += 1) {
      resolveRequestUserIdMock.mockResolvedValueOnce(`inaccurate-voter-${index}`);
      const response = await postVote(
        jsonRequest(`http://localhost/api/points/${point.id}/votes`, "POST", {
          value: "inaccurate",
        }),
        { params: Promise.resolve({ id: point.id }) },
      );
      const payload = (await response.json()) as {
        point: { verificationStatus: string };
      };
      lastStatus = payload.point.verificationStatus;
    }

    expect(lastStatus).toBe("inaccurate");
  });
});

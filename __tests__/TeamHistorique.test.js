import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("js-cookie", () => ({
  get: jest.fn().mockReturnValue("fake-jwt"),
  set: jest.fn(),
  remove: jest.fn(),
}));

global.fetch = jest.fn();

import TeamHistorique from "../src/app/componants/TeamHistorique";

describe("TeamHistorique", () => {
  const mockTeam = { documentId: "team-1", nom: "TestTeam" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("affiche le spinner de chargement", () => {
    global.fetch.mockImplementation(() => new Promise(() => {}));
    render(<TeamHistorique team={mockTeam} />);
    expect(screen.getByText(/Chargement/)).toBeInTheDocument();
  });

  it("affiche les boutons de filtre", async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });

    render(<TeamHistorique team={mockTeam} />);

    await waitFor(() => {
      expect(screen.getByText("Tout")).toBeInTheDocument();
      expect(screen.getByText("Membres")).toBeInTheDocument();
      expect(screen.getByText("Tâches")).toBeInTheDocument();
      expect(screen.getByText("Annonces")).toBeInTheDocument();
      expect(screen.getByText("Invitations")).toBeInTheDocument();
    });
  });

  it("affiche le message vide quand pas d'activité", async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });

    render(<TeamHistorique team={mockTeam} />);

    await waitFor(() => {
      expect(screen.getByText("Aucune activité récente")).toBeInTheDocument();
    });
  });

  it("affiche des événements quand il y a des invitations", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 1,
              status: "accepted",
              role: "member",
              user: { id: 2, username: "Alice" },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });

    render(<TeamHistorique team={mockTeam} />);

    await waitFor(() => {
      expect(screen.getByText(/Alice a rejoint la team/)).toBeInTheDocument();
    });
  });
});

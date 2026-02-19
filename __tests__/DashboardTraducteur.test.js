import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("js-cookie", () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}));

import DashboardTraducteur from "../src/app/components/DashboardTraducteur";
const Cookies = require("js-cookie");

describe("DashboardTraducteur", () => {
  const mockUser = { id: 1, username: "Traducteur1" };

  beforeEach(() => {
    Cookies.get.mockReturnValue("fake-jwt");
    global.fetch = jest.fn();
  });

  afterEach(() => {
    cleanup();
    jest.resetAllMocks();
  });

  it("affiche le spinner de chargement", () => {
    global.fetch.mockImplementation(() => new Promise(() => {})); // never resolves
    render(<DashboardTraducteur user={mockUser} />);
    expect(screen.getByText("Chargement du dashboard...")).toBeInTheDocument();
  });

  it("affiche un message quand pas d'œuvres", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<DashboardTraducteur user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText("Pas encore de données")).toBeInTheDocument();
    });
  });

  it("affiche les stats quand des œuvres existent", async () => {
    // Mock oeuvres fetch
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              documentId: "oeuvre-1",
              titre: "Mon Œuvre",
              couverture: null,
              chapitres: [{ id: 1 }, { id: 2 }],
            },
          ],
        }),
      })
      // Mock tracking fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: 1, type: "vue", oeuvreId: "oeuvre-1", cibleType: "oeuvre", cibleId: "oeuvre-1", createdAt: new Date().toISOString() },
            { id: 2, type: "vue", oeuvreId: "oeuvre-1", cibleType: "oeuvre", cibleId: "oeuvre-1", createdAt: new Date().toISOString() },
            { id: 3, type: "like", oeuvreId: "oeuvre-1", cibleType: "oeuvre", cibleId: "oeuvre-1", createdAt: new Date().toISOString() },
          ],
        }),
      });

    await act(async () => {
      render(<DashboardTraducteur user={mockUser} />);
    });

    // Flush all pending state updates
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(screen.getAllByText("Vues").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Likes").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Statistiques/).length).toBeGreaterThanOrEqual(1);
  });

  it("affiche les filtres de période", async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ documentId: "o1", titre: "Test", chapitres: [] }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });

    render(<DashboardTraducteur user={mockUser} />);

    await waitFor(() => {
      // Period select defaults to "30" which maps to "30 jours" option
      expect(screen.getByText("30 jours")).toBeInTheDocument();
    });
  });
});

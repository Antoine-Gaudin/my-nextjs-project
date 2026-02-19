import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("js-cookie", () => ({
  get: jest.fn().mockReturnValue(undefined),
  set: jest.fn(),
  remove: jest.fn(),
}));

global.fetch = jest.fn();

import TeamAnnonces from "../src/app/components/TeamAnnonces";

describe("TeamAnnonces", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("affiche le spinner de chargement", () => {
    global.fetch.mockImplementation(() => new Promise(() => {}));
    render(<TeamAnnonces oeuvreId="test-oeuvre-id" />);
    expect(screen.getByText("Chargement des annonces...")).toBeInTheDocument();
  });

  it("affiche le message vide quand pas de team ni owner", async () => {
    // Mock user/me — no jwt so no fetch
    // Mock teams fetch — aucune team liée
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    })
    // Mock annonces fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<TeamAnnonces oeuvreId="test-oeuvre-id" />);

    await waitFor(() => {
      expect(screen.getByText("Aucune annonce pour le moment")).toBeInTheDocument();
    });
  });
});

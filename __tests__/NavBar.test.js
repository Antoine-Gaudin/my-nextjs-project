import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => "/",
}));

// Mock js-cookie
jest.mock("js-cookie", () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}));

import NavBar from "../src/app/componants/NavBar";

describe("NavBar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("affiche le logo Trad-Index", () => {
    render(<NavBar />);
    expect(screen.getByText("Trad-Index")).toBeInTheDocument();
  });

  it("affiche les liens de navigation publics", () => {
    render(<NavBar />);
    // Desktop + mobile nav = duplicate links
    expect(screen.getAllByText("Accueil").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Catalogue").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Documentation").length).toBeGreaterThanOrEqual(1);
  });

  it("affiche le lien Teams pour tous les visiteurs", () => {
    render(<NavBar />);
    const teamsLinks = screen.getAllByText("Teams");
    expect(teamsLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("affiche Connexion quand non connecté", () => {
    const Cookies = require("js-cookie");
    Cookies.get.mockReturnValue(undefined);
    render(<NavBar />);
    // Desktop + mobile nav both show Connexion
    expect(screen.getAllByText("Connexion").length).toBeGreaterThanOrEqual(1);
  });

  it("affiche Mon Profil quand connecté", () => {
    const Cookies = require("js-cookie");
    Cookies.get.mockReturnValue("fake-jwt-token");
    render(<NavBar />);
    const profilLinks = screen.getAllByText("Mon Profil");
    expect(profilLinks.length).toBeGreaterThanOrEqual(1);
  });
});

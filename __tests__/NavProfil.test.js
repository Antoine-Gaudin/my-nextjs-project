import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock("js-cookie", () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}));

import NavProfil from "../src/app/componants/NavProfil";

describe("NavProfil", () => {
  const mockOnMenuSelect = jest.fn();

  it("affiche les menus de base", () => {
    render(
      <NavProfil
        onMenuSelect={mockOnMenuSelect}
        user={{ id: 1, username: "TestUser" }}
        activeMenu="profil"
      />
    );
    // Use getAllByText for Profil since it may match multiple elements
    expect(screen.getAllByText(/Profil/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Mes Teams/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Paramètre/i).length).toBeGreaterThanOrEqual(1);
  });

  it("affiche Dashboard et Page Édition pour les rédacteurs", () => {
    render(
      <NavProfil
        onMenuSelect={mockOnMenuSelect}
        user={{ id: 1, username: "TestUser", redacteur: true }}
        activeMenu="profil"
      />
    );
    expect(screen.getByText(/Dashboard/)).toBeInTheDocument();
    expect(screen.getByText(/Page Édition/)).toBeInTheDocument();
  });

  it("masque Dashboard et Page Édition pour les non-rédacteurs", () => {
    render(
      <NavProfil
        onMenuSelect={mockOnMenuSelect}
        user={{ id: 1, username: "TestUser", redacteur: false }}
        activeMenu="profil"
      />
    );
    expect(screen.queryByText(/Dashboard/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Page Édition/)).not.toBeInTheDocument();
  });

  it("a un bouton de déconnexion", () => {
    render(
      <NavProfil
        onMenuSelect={mockOnMenuSelect}
        user={{ id: 1, username: "TestUser" }}
        activeMenu="profil"
      />
    );
    expect(screen.getByText(/Déconnexion/)).toBeInTheDocument();
  });
});

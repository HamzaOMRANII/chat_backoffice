import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoginPage } from "./LoginPage";

describe("Backoffice LoginPage", () => {
  it("explains that admin sign-in is not open yet", () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Admin username"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("status")).toHaveTextContent("Admin sign-in opens in the next release.");
  });
});

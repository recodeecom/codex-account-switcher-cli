import { describe, expect, it } from "vitest";

import {
  MedusaAuthResponseSchema,
  MedusaCustomerLoginRequestSchema,
  MedusaCustomerResponseSchema,
  MedusaCustomerRegisterRequestSchema,
} from "@/features/medusa-customer-auth/schemas";

describe("medusa customer auth schemas", () => {
  it("validates login payload", () => {
    expect(
      MedusaCustomerLoginRequestSchema.safeParse({
        email: "customer@example.com",
        password: "supersecret",
      }).success,
    ).toBe(true);

    expect(
      MedusaCustomerLoginRequestSchema.safeParse({
        email: "not-an-email",
        password: "supersecret",
      }).success,
    ).toBe(false);
  });

  it("validates register payload with optional names", () => {
    expect(
      MedusaCustomerRegisterRequestSchema.safeParse({
        email: "customer@example.com",
        password: "supersecret",
        firstName: "Test",
        lastName: "Customer",
      }).success,
    ).toBe(true);
  });

  it("accepts token or location auth responses", () => {
    expect(MedusaAuthResponseSchema.safeParse({ token: "jwt" }).success).toBe(true);
    expect(
      MedusaAuthResponseSchema.safeParse({ location: "https://example.com" }).success,
    ).toBe(true);
  });

  it("parses customer response payload", () => {
    const parsed = MedusaCustomerResponseSchema.parse({
      customer: {
        id: "cus_123",
        email: "customer@example.com",
        first_name: "Test",
        last_name: "Customer",
        phone: null,
      },
    });

    expect(parsed.customer.email).toBe("customer@example.com");
  });
});

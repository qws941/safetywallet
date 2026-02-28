"use client";

import { useEffect } from "react";

export default function RegisterPage() {
  useEffect(() => {
    window.location.replace("/login/");
  }, []);

  return null;
}

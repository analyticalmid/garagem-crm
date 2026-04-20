"use client";

import { useEffect, useState } from "react";
import ClientApp from "./client-app";

export default function ClientShell() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <ClientApp />;
}

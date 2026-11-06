import { notFound } from "next/navigation";
import { DragonShowcase } from "./showcase";
import "./showcase.css";

export default function DragonShowcasePage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <DragonShowcase />;
}

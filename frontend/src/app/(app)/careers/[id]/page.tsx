import { Suspense } from "react";
import CareerView from "./CareerView";

export default function CareerPage() {
  return (
    <Suspense fallback={null}>
      <CareerView />
    </Suspense>
  );
}

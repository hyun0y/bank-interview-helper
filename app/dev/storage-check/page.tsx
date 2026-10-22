// 개발 중에만 쓰는 점검 화면입니다. 배포(production)에서는 열리지 않습니다(404).
import { notFound } from "next/navigation";
import StorageCheck from "./StorageCheck";

export default function StorageCheckPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StorageCheck />;
}

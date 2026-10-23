// PDF를 브라우저에서 읽는 데 필요한 pdf.js 파일(작업자 스크립트, 한글 글꼴 매핑표)을
// public/pdfjs 폴더로 복사합니다. npm install 할 때마다 자동으로 실행됩니다.
// (복사된 파일은 만들어지는 파일이라 Git에는 올리지 않습니다.)
import { cpSync, existsSync, mkdirSync } from "node:fs";

const from = "node_modules/pdfjs-dist";
const to = "public/pdfjs";

if (!existsSync(from)) {
  console.log("pdfjs-dist가 아직 설치되지 않아 복사를 건너뜁니다.");
} else {
  mkdirSync(to, { recursive: true });
  cpSync(`${from}/build/pdf.worker.min.mjs`, `${to}/pdf.worker.min.mjs`);
  cpSync(`${from}/cmaps`, `${to}/cmaps`, { recursive: true });
  console.log("pdf.js 파일을 public/pdfjs 로 복사했습니다.");
}

import { Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { mkdir, readFile } from 'fs/promises';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

type PdfTextSample = { pages: string[]; charCount: number };

@Injectable()
export class OcrRunner {
  async ensureDir(path: string) {
    await mkdir(path, { recursive: true });
  }

  async pdfToText(pdfPath: string): Promise<string> {
    const { stdout } = await execFileAsync('pdftotext', ['-layout', pdfPath, '-']);
    return stdout || '';
  }

  async pdfToTextSample(pdfPath: string, maxPages: number): Promise<PdfTextSample> {
    const { stdout } = await execFileAsync('pdftotext', ['-f', '1', '-l', String(maxPages), pdfPath, '-']);
    const text = stdout || '';
    const pages = text.split('\f');
    const charCount = text.replace(/\s+/g, '').length;
    return { pages, charCount };
  }

  async pdfPageCount(pdfPath: string): Promise<number> {
    const { stdout } = await execFileAsync('pdfinfo', [pdfPath]);
    const line = (stdout || '')
      .split('\n')
      .find((l) => l.toLowerCase().startsWith('pages:'));
    if (!line) return 0;
    const count = Number(line.split(':')[1]?.trim());
    return Number.isFinite(count) ? count : 0;
  }

  async renderPagesToPng(pdfPath: string, outPrefix: string, firstPage: number, lastPage: number) {
    // pdftoppm writes files like `${outPrefix}-${page}.png`
    await execFileAsync('pdftoppm', [
      '-f',
      String(firstPage),
      '-l',
      String(lastPage),
      '-png',
      '-r',
      '150',
      pdfPath,
      outPrefix,
    ]);
  }

  async tesseractPngToText(pngPath: string): Promise<string> {
    const { stdout } = await execFileAsync('tesseract', [pngPath, 'stdout', '-l', 'eng']);
    return stdout || '';
  }

  async readFileText(path: string) {
    return (await readFile(path, 'utf8')).toString();
  }
}


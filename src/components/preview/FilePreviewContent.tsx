import { useEffect, useState } from 'react';
import { Alert, Button, Empty, Input, List, Select, Skeleton, Tag } from 'antd';
import type { Sheet } from 'read-excel-file/browser';
import {
  canPreview,
  decodePreviewText,
  extractPreviewEntry,
  inspectPreviewZip,
  isTextPreview,
  previewFormat,
  previewImageTypes,
} from '../../lib/file-preview';
import type { PreviewZipEntry } from '../../lib/file-preview';
import { errorMessage } from '../../lib/api';
import { formatBytes } from '../../lib/utils';

type Content =
  | { kind: 'image' | 'pdf' | 'video' | 'audio'; url: string }
  | { kind: 'text'; text: string; truncated: boolean }
  | { kind: 'docx'; html: string }
  | { kind: 'xlsx'; sheets: Sheet[] }
  | { kind: 'zip'; bytes: Uint8Array; entries: PreviewZipEntry[] }
  | {
      kind: 'pptx';
      bytes: Uint8Array;
      entries: PreviewZipEntry[];
      slides: string[];
    }
  | { kind: 'unsupported' };

function xml(bytes: Uint8Array) {
  const value = new TextDecoder().decode(bytes);
  if (/<!DOCTYPE|<!ENTITY/i.test(value))
    throw new Error('Tài liệu có cấu trúc XML không được hỗ trợ.');
  const result = new DOMParser().parseFromString(value, 'application/xml');
  if (result.getElementsByTagName('parsererror').length)
    throw new Error('Không đọc được nội dung tài liệu.');
  return result;
}
function resolvePart(base: string, target: string) {
  const parts = target.startsWith('/') ? [] : base.split('/').slice(0, -1);
  for (const part of target.split('/')) {
    if (part === '..') parts.pop();
    else if (part && part !== '.') parts.push(part);
  }
  return parts.join('/');
}
function relationshipMap(
  bytes: Uint8Array,
  base: string,
  entries: PreviewZipEntry[],
) {
  const name = base.replace(/([^/]+)$/, '_rels/$1.rels');
  if (!entries.some((entry) => entry.name === name))
    return new Map<string, string>();
  const document = xml(extractPreviewEntry(bytes, name));
  return new Map(
    Array.from(document.getElementsByTagNameNS('*', 'Relationship'))
      .filter((node) => node.getAttribute('TargetMode') !== 'External')
      .map((node) => [
        node.getAttribute('Id') ?? '',
        resolvePart(base, node.getAttribute('Target') ?? ''),
      ]),
  );
}
function imageData(bytes: Uint8Array, mime: string) {
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 32768)
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 32768)));
  return `data:${mime};base64,${btoa(chunks.join(''))}`;
}

function Spreadsheet({ sheets }: { sheets: Sheet[] }) {
  const [sheet, setSheet] = useState(0);
  const current = sheets[sheet];
  const rows = current?.data.slice(0, 200) ?? [];
  const columns = Math.min(50, Math.max(0, ...rows.map((row) => row.length)));
  const columnName = (index: number): string =>
    index < 26
      ? String.fromCharCode(65 + index)
      : `${String.fromCharCode(64 + Math.floor(index / 26))}${String.fromCharCode(65 + (index % 26))}`;
  return (
    <>
      <Select
        className="mb-4 min-w-48"
        aria-label="Chọn trang tính"
        value={sheet}
        options={sheets.map((item, index) => ({
          value: index,
          label: item.sheet,
        }))}
        onChange={setSheet}
      />
      {current && (
        <p className="text-sm text-muted">
          {current.data.length} hàng · Xem trước tối đa 200 hàng và 50 cột
        </p>
      )}
      <div className="file-preview-sheet">
        <table>
          <thead>
            <tr>
              <th>#</th>
              {Array.from({ length: columns }, (_, index) => (
                <th key={index}>{columnName(index)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <th>{rowIndex + 1}</th>
                {Array.from({ length: columns }, (_, column) => {
                  const value = row[column];
                  const text =
                    value instanceof Date
                      ? value.toLocaleDateString('vi-VN')
                      : String(value ?? '');
                  return (
                    <td key={column} title={text}>
                      {text.slice(0, 2000)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function slidePaths(bytes: Uint8Array, entries: PreviewZipEntry[]) {
  const relation = relationshipMap(bytes, 'ppt/presentation.xml', entries);
  const document = xml(extractPreviewEntry(bytes, 'ppt/presentation.xml'));
  const ordered = Array.from(document.getElementsByTagNameNS('*', 'sldId'))
    .map((node) => relation.get(node.getAttribute('r:id') ?? ''))
    .filter((name): name is string => !!name);
  return (
    ordered.length
      ? ordered
      : entries
          .map((entry) => entry.name)
          .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  ).slice(0, 100);
}
function Slides({
  bytes,
  entries,
  slides,
}: {
  bytes: Uint8Array;
  entries: PreviewZipEntry[];
  slides: string[];
}) {
  const [index, setIndex] = useState(0);
  const [data, setData] = useState<{
    paragraphs: string[];
    images: string[];
  }>();
  const [error, setError] = useState('');
  useEffect(() => {
    setError('');
    setData(undefined);
    try {
      const name = slides[index];
      if (!name) throw new Error('Tài liệu chưa có trang chiếu.');
      const slide = xml(extractPreviewEntry(bytes, name));
      const paragraphs = Array.from(slide.getElementsByTagNameNS('*', 'p'))
        .map((node) =>
          Array.from(node.getElementsByTagNameNS('*', 't'))
            .map((text) => text.textContent ?? '')
            .join(''),
        )
        .filter(Boolean);
      const relationships = relationshipMap(bytes, name, entries);
      const images: string[] = [];
      for (const node of Array.from(
        slide.getElementsByTagNameNS('*', 'blip'),
      ).slice(0, 12)) {
        const part = relationships.get(node.getAttribute('r:embed') ?? '');
        if (!part) continue;
        const mime = previewImageTypes[previewFormat(part)];
        if (
          mime &&
          entries.some(
            (entry) => entry.name === part && entry.bytes <= 5 * 1024 * 1024,
          )
        )
          images.push(imageData(extractPreviewEntry(bytes, part), mime));
      }
      setData({ paragraphs, images });
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }, [bytes, entries, index, slides]);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          aria-label="Chọn trang chiếu"
          className="min-w-48"
          value={index}
          options={slides.map((_, number) => ({
            value: number,
            label: `Trang chiếu ${number + 1}`,
          }))}
          onChange={setIndex}
        />
        <Tag>Xem nội dung trang chiếu</Tag>
      </div>
      {error ? (
        <Alert type="error" title={error} />
      ) : !data ? (
        <Skeleton active />
      ) : (
        <article className="file-preview-document">
          <h2>Trang chiếu {index + 1}</h2>
          {data.paragraphs.map((text, number) => (
            <p key={number}>{text}</p>
          ))}
          {data.images.map((src, number) => (
            <img
              key={number}
              src={src}
              alt={`Hình ${number + 1} trong trang chiếu ${index + 1}`}
            />
          ))}
          {!data.paragraphs.length && !data.images.length && (
            <Empty description="Trang chiếu không có văn bản hoặc hình ảnh để xem trước" />
          )}
        </article>
      )}
    </>
  );
}
function ZipContent({
  bytes,
  entries,
  depth,
}: {
  bytes: Uint8Array;
  entries: PreviewZipEntry[];
  depth: number;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ name: string; blob: Blob }>();
  const [error, setError] = useState('');
  const filtered = entries.filter((entry) =>
    entry.name.toLowerCase().includes(search.toLowerCase()),
  );
  function open(entry: PreviewZipEntry) {
    setError('');
    try {
      const data = extractPreviewEntry(bytes, entry.name);
      setSelected({ name: entry.name, blob: new Blob([new Uint8Array(data)]) });
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }
  return (
    <div className="file-preview-archive">
      <div>
        <Input.Search
          aria-label="Tìm file trong ZIP"
          placeholder="Tìm tên file trong ZIP"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <p className="mt-3 text-sm text-muted">
          {entries.length} file · Chọn file để xem
        </p>
        <List
          size="small"
          dataSource={filtered}
          pagination={{ pageSize: 15, size: 'small', showSizeChanger: false }}
          renderItem={(entry) => (
            <List.Item>
              <Button
                type="link"
                className="h-auto max-w-full whitespace-normal break-all text-left"
                disabled={
                  entry.bytes > 10 * 1024 * 1024 ||
                  !canPreview(previewFormat(entry.name)) ||
                  (depth >= 1 && previewFormat(entry.name) === 'zip')
                }
                onClick={() => open(entry)}
              >
                {entry.name}
              </Button>
              <span className="shrink-0 text-xs text-muted">
                {formatBytes(entry.bytes)}
              </span>
            </List.Item>
          )}
        />
      </div>
      <div className="min-w-0">
        {error && <Alert className="mb-3" type="error" title={error} />}
        {selected ? (
          <>
            <p className="mb-3 break-all font-semibold">{selected.name}</p>
            <FilePreviewContent
              key={selected.name}
              blob={selected.blob}
              filename={selected.name}
              format={previewFormat(selected.name)}
              depth={depth + 1}
            />
          </>
        ) : (
          <Empty description="Chọn một file bên trái để xem nội dung" />
        )}
      </div>
    </div>
  );
}

export default function FilePreviewContent({
  blob,
  filename,
  format,
  depth = 0,
}: {
  blob: Blob;
  filename: string;
  format: string;
  depth?: number;
}) {
  const [content, setContent] = useState<Content>();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    setContent(undefined);
    setError('');
    void (async () => {
      let result: Content;
      const imageType = Object.hasOwn(previewImageTypes, format)
        ? previewImageTypes[format]
        : undefined;
      if (
        imageType ||
        format === 'pdf' ||
        ['mp4', 'webm', 'mp3', 'wav', 'ogg'].includes(format)
      ) {
        const mime =
          imageType ??
          (
            {
              pdf: 'application/pdf',
              mp4: 'video/mp4',
              webm: 'video/webm',
              mp3: 'audio/mpeg',
              wav: 'audio/wav',
              ogg: 'audio/ogg',
            } as Record<string, string>
          )[format];
        objectUrl = URL.createObjectURL(new Blob([blob], { type: mime }));
        result = {
          kind: imageType
            ? 'image'
            : format === 'pdf'
              ? 'pdf'
              : ['mp4', 'webm'].includes(format)
                ? 'video'
                : 'audio',
          url: objectUrl,
        };
      } else if (isTextPreview(format)) {
        result = {
          kind: 'text',
          text: decodePreviewText(new Uint8Array(await blob.arrayBuffer())),
          truncated: blob.size > 2 * 1024 * 1024,
        };
      } else if (['docx', 'xlsx', 'pptx', 'zip'].includes(format)) {
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const entries = inspectPreviewZip(bytes);
        if (format === 'docx') {
          const [{ default: mammoth }, { default: purify }] = await Promise.all(
            [import('mammoth'), import('dompurify')],
          );
          const converted = await mammoth.convertToHtml(
            { arrayBuffer: buffer },
            {
              externalFileAccess: false,
              includeEmbeddedStyleMap: false,
              convertImage: mammoth.images.imgElement(async (image) => ({
                src: /^image\/(?:png|jpeg|gif|webp)$/.test(image.contentType)
                  ? `data:${image.contentType};base64,${await image.readAsBase64String()}`
                  : '',
              })),
            },
          );
          const html = purify.sanitize(converted.value, {
            USE_PROFILES: { html: true },
            FORBID_TAGS: [
              'style',
              'iframe',
              'object',
              'embed',
              'form',
              'svg',
              'math',
            ],
            FORBID_ATTR: ['style', 'srcset'],
          });
          const template = document.createElement('template');
          template.innerHTML = html;
          template.content.querySelectorAll('img').forEach((image) => {
            if (
              !/^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(
                image.getAttribute('src') ?? '',
              )
            )
              image.remove();
          });
          template.content.querySelectorAll('a').forEach((link) => {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
          });
          result = { kind: 'docx', html: template.innerHTML };
        } else if (format === 'xlsx') {
          if (
            entries.some(
              (entry) =>
                /^xl\/worksheets\//.test(entry.name) &&
                entry.bytes > 10 * 1024 * 1024,
            )
          )
            throw new Error(
              'Trang tính quá lớn để xem trước. Vui lòng tải file để mở đầy đủ.',
            );
          const { default: readExcel } =
            await import('read-excel-file/browser');
          result = { kind: 'xlsx', sheets: await readExcel(blob) };
        } else if (format === 'pptx')
          result = {
            kind: 'pptx',
            bytes,
            entries,
            slides: slidePaths(bytes, entries),
          };
        else result = { kind: 'zip', bytes, entries };
      } else result = { kind: 'unsupported' };
      if (active) setContent(result);
      else if (objectUrl) URL.revokeObjectURL(objectUrl);
    })().catch((reason: unknown) => {
      if (active) setError(errorMessage(reason));
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [blob, format]);
  if (error)
    return (
      <Alert
        type="error"
        showIcon
        title="Không đọc được nội dung file"
        description={error}
      />
    );
  if (!content)
    return (
      <div role="status" aria-label="Đang chuẩn bị xem trước">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  if (content.kind === 'image')
    return (
      <img className="file-preview-image" src={content.url} alt={filename} />
    );
  if (content.kind === 'pdf')
    return (
      <iframe
        className="file-preview-pdf"
        src={content.url}
        title={`PDF: ${filename}`}
        referrerPolicy="no-referrer"
      />
    );
  if (content.kind === 'video')
    return (
      <video
        className="file-preview-image"
        src={content.url}
        controls
        preload="metadata"
      />
    );
  if (content.kind === 'audio')
    return (
      <audio className="w-full" src={content.url} controls preload="metadata" />
    );
  if (content.kind === 'text')
    return (
      <>
        {content.truncated && (
          <p className="text-sm text-muted">Đang hiển thị 2 MB đầu của file.</p>
        )}
        <pre className="file-preview-code">{content.text}</pre>
      </>
    );
  if (content.kind === 'docx')
    return (
      <>
        <p className="text-sm text-muted">Xem nội dung tài liệu Word</p>
        <article
          className="file-preview-document"
          dangerouslySetInnerHTML={{ __html: content.html }}
        />
      </>
    );
  if (content.kind === 'xlsx') return <Spreadsheet sheets={content.sheets} />;
  if (content.kind === 'pptx')
    return (
      <Slides
        bytes={content.bytes}
        entries={content.entries}
        slides={content.slides}
      />
    );
  if (content.kind === 'zip')
    return (
      <ZipContent
        bytes={content.bytes}
        entries={content.entries}
        depth={depth}
      />
    );
  return (
    <Empty description="Định dạng này chưa hỗ trợ xem trực tiếp. Bạn có thể tải file gốc để mở." />
  );
}

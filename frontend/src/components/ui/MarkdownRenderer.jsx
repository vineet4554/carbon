import React from "react";

export const MarkdownRenderer = ({ content }) => {
  if (!content) return null;

  const parseInlineMarkdown = (text) => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <strong key={match.index} className="font-extrabold text-slate-950 dark:text-white">
          {match[1]}
        </strong>
      );
      lastIndex = boldRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    const finalParts = parts.length > 0 ? parts : [text];
    return finalParts.map((part, pIdx) => {
      if (typeof part !== "string") return part;
      const italicRegex = /\*(.*?)\*/g;
      const subParts = [];
      let lastSubIndex = 0;
      let subMatch;

      while ((subMatch = italicRegex.exec(part)) !== null) {
        if (subMatch.index > lastSubIndex) {
          subParts.push(part.substring(lastSubIndex, subMatch.index));
        }
        subParts.push(
          <em key={subMatch.index} className="italic text-slate-600 dark:text-slate-300">
            {subMatch[1]}
          </em>
        );
        lastSubIndex = italicRegex.lastIndex;
      }
      if (lastSubIndex < part.length) {
        subParts.push(part.substring(lastSubIndex));
      }
      return <React.Fragment key={pIdx}>{subParts}</React.Fragment>;
    });
  };

  const lines = content.split("\n");
  let inTable = false;
  let tableHeaders = [];
  let tableRows = [];
  const elements = [];

  lines.forEach((line, idx) => {
    if (line.trim().startsWith("|")) {
      const cells = line
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c !== "");
      if (line.includes("---")) return;

      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      return;
    } else if (inTable) {
      inTable = false;
      elements.push(
        <div
          key={`table-${idx}`}
          className="my-3 overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/60"
        >
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                {tableHeaders.map((th, i) => (
                  <th key={i} className="px-4 py-2 font-bold text-slate-950 dark:text-white uppercase tracking-wider">
                    {th}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => (
                <tr key={i} className="border-b border-slate-200 dark:border-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-900/10">
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-2 text-slate-700 dark:text-slate-300">
                      {parseInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      tableHeaders = [];
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={idx} className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-4 mb-2 uppercase tracking-wider">
          {line.substring(4)}
        </h3>
      );
    } else if (line.startsWith("#### ")) {
      elements.push(
        <h4 key={idx} className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-3 mb-1.5 uppercase tracking-wide">
          {line.substring(5)}
        </h4>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={idx} className="text-base font-black text-slate-900 dark:text-white mt-5 mb-2 border-b border-slate-200 dark:border-slate-800 pb-1">
          {line.substring(3)}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1 key={idx} className="text-lg font-black text-slate-900 dark:text-white mt-5 mb-2">
          {line.substring(2)}
        </h1>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={idx} className="ml-5 list-disc text-slate-700 dark:text-slate-300 my-1 leading-relaxed">
          {parseInlineMarkdown(line.substring(2))}
        </li>
      );
    } else if (/^\d+\.\s+/.test(line)) {
      const lineContent = line.replace(/^\d+\.\s+/, "");
      const num = line.match(/^(\d+)\./)?.[1] || "1";
      elements.push(
        <div key={idx} className="flex gap-2 ml-2 my-1 leading-relaxed text-slate-700 dark:text-slate-300">
          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{num}.</span>
          <span>{parseInlineMarkdown(lineContent)}</span>
        </div>
      );
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={idx}
          className="border-l-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/10 px-4 py-2 rounded-r-lg text-slate-600 dark:text-slate-400 my-3 italic leading-relaxed"
        >
          {parseInlineMarkdown(line.substring(2))}
        </blockquote>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={idx} className="h-2" />);
    } else {
      elements.push(
        <p key={idx} className="text-slate-700 dark:text-slate-300 my-1 leading-relaxed">
          {parseInlineMarkdown(line)}
        </p>
      );
    }
  });

  if (inTable) {
    elements.push(
      <div
        key="table-final"
        className="my-3 overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/60"
      >
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
              {tableHeaders.map((th, i) => (
                <th key={i} className="px-4 py-2 font-bold text-slate-950 dark:text-white uppercase tracking-wider">
                  {th}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, i) => (
              <tr key={i} className="border-b border-slate-200 dark:border-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-900/10">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-2 text-slate-700 dark:text-slate-300">
                    {parseInlineMarkdown(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <>{elements}</>;
};

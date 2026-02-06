"use client";

import React, { useRef, useState } from "react";
import { Editor } from "@tinymce/tinymce-react";

const RichEditor = ({ value, onChange, height = 400, placeholder = "Commencez a ecrire..." }) => {
  const editorRef = useRef(null);
  const [loading, setLoading] = useState(true);

  return (
    <div className="relative">
      {loading && (
        <div
          className="flex items-center justify-center bg-gray-800 rounded-lg border border-gray-700"
          style={{ height: `${height}px` }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-400 text-sm">Chargement de l'editeur...</span>
          </div>
        </div>
      )}
      <div className={loading ? "opacity-0 h-0 overflow-hidden" : ""}>
        <Editor
          tinymceScriptSrc="/tinymce/tinymce.min.js"
          onInit={(evt, editor) => {
            editorRef.current = editor;
            setLoading(false);
          }}
          value={value}
          onEditorChange={(content) => {
            if (onChange) onChange(content);
          }}
          init={{
            height,
            placeholder,
            menubar: false,
            skin: "oxide-dark",
            content_css: "dark",
            plugins: [
              "advlist",
              "autolink",
              "lists",
              "link",
              "image",
              "charmap",
              "preview",
              "anchor",
              "searchreplace",
              "visualblocks",
              "code",
              "fullscreen",
              "insertdatetime",
              "media",
              "table",
              "wordcount",
            ],
            toolbar:
              "undo redo | blocks fontsize | bold italic underline strikethrough | forecolor backcolor | " +
              "alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | " +
              "link image | removeformat | fullscreen",
            toolbar_mode: "sliding",
            content_style: `
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 16px;
                color: #e5e7eb;
                background-color: #1f2937;
                padding: 8px;
              }
            `,
            branding: false,
            promotion: false,
            statusbar: true,
            resize: true,
            automatic_uploads: false,
          }}
        />
      </div>
    </div>
  );
};

export default RichEditor;

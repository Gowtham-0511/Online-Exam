import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
    Undo2,
    Redo2,
    Bold,
    Italic,
    Strikethrough,
    Code,
    Underline,
    Link,
} from 'lucide-react'

const MenuBar = ({ editor }) => {
    if (!editor) {
        return null
    }

    const addLink = () => {
        const url = window.prompt('Enter URL:')
        if (url) {
            editor.chain().focus().setLink({ href: url }).run()
        }
    }

    return (
        <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1 bg-gray-50">
            <button
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().chain().focus().undo().run()}
                className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Undo"
            >
                <Undo2 className="w-4 h-4" />
            </button>

            <button
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().chain().focus().redo().run()}
                className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Redo"
            >
                <Redo2 className="w-4 h-4" />
            </button>

            <div className="w-px h-8 bg-gray-300 mx-1"></div>

            <select
                onChange={(e) => {
                    const level = e.target.value
                    if (level === 'paragraph') {
                        editor.chain().focus().setParagraph().run()
                    } else {
                        editor.chain().focus().toggleHeading({ level: parseInt(level) }).run()
                    }
                }}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value="paragraph">Normal</option>
                <option value="1">Heading 1</option>
                <option value="2">Heading 2</option>
                <option value="3">Heading 3</option>
                <option value="4">Heading 4</option>
                <option value="5">Heading 5</option>
                <option value="6">Heading 6</option>
            </select>

            <div className="w-px h-8 bg-gray-300 mx-1"></div>

            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-blue-100 text-blue-600' : ''}`}
                title="Bold"
            >
                <Bold className="w-4 h-4" />
            </button>

            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-blue-100 text-blue-600' : ''}`}
                title="Italic"
            >
                <Italic className="w-4 h-4" />
            </button>

            <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('strike') ? 'bg-blue-100 text-blue-600' : ''}`}
                title="Strikethrough"
            >
                <Strikethrough className="w-4 h-4" />
            </button>

            <button
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('code') ? 'bg-blue-100 text-blue-600' : ''}`}
                title="Inline Code"
            >
                <Code className="w-4 h-4" />
            </button>

            <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className="p-2 rounded hover:bg-gray-200"
                title="Underline"
            >
                <Underline className="w-4 h-4" />
            </button>

            <button
                onClick={addLink}
                className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-blue-100 text-blue-600' : ''}`}
                title="Add Link"
            >
                <Link className="w-4 h-4" />
            </button>
        </div>
    )
}

const Tiptap = () => {
    const editor = useEditor({
        extensions: [StarterKit],
        content: '<p>Hello World! 🌎️</p>',
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4',
            },
        },
    })

    return (
        <div className="max-w-4xl mx-auto mt-8 border border-gray-200 rounded-lg overflow-hidden shadow-lg">
            <MenuBar editor={editor} />
            <div className="bg-white">
                <EditorContent editor={editor} />
            </div>
        </div>
    )
}

export default Tiptap
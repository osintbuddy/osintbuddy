import { auraInit } from "@uiw/codemirror-theme-aura";
import CodeMirror from "@uiw/react-codemirror";
import { tags as t } from "@lezer/highlight";
import { python } from "@codemirror/lang-python";
import { useEffect, useRef, useState } from "preact/hooks";
import { CommandLineIcon, LockClosedIcon, LockOpenIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { Icon } from "../icons";
import { toast } from "react-toastify";
import { PlayIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { EditorView } from "@codemirror/view"
import { ResizableBox } from 'react-resizable';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import ButtonGhost from "../buttons/ButtonGhost";
import Button from "../buttons";

export const auraTheme = auraInit({
  settings: {
    caret: "#cbd5ef",
    background: 'rgba(0 0 0 0)',
    fontFamily: 'Fira Code',
    gutterBackground: 'rgba(36, 46, 107, .17)',
    selectionMatch: 'rgba(76, 86, 107, .14)',
    lineHighlight: 'rgba(36, 46, 77, .20)',
  },
  styles: [
    { tag: [t.definitionOperator, t.bool, t.logicOperator, t.bitwiseOperator, t.controlOperator,], color: "#ec4899" },
    { tag: [t.processingInstruction, t.string, t.inserted, t.special(t.string), t.function(t.propertyName,), t.function(t.variableName),], color: "#2dd4bf" },
    { tag: [t.keyword, t.definitionKeyword, t.special(t.keyword), t.attributeValue, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: "#a855f7" },
    { tag: [t.variableName, t.deleted, t.character, t.name, t.special(t.variableName)], color: "#cbd5efEF" },
    { tag: [t.docString, t.docComment, t.className, t.punctuation,], color: "#49B6FE" },
    { tag: [t.propertyName,], color: "#34d399" },
    { tag: [t.string], color: "#4ade80" },
    { tag: [t.number,], color: "#D8454A" },
    { tag: [t.comment, t.lineComment, t.blockComment, t.punctuation], color: "#5a6fbc" },
  ],
})

export function CodeEditor({ code, setCode, editable = true }: JSONObject) {
  return (
    <CodeMirror
      editable={editable}
      theme={auraTheme}
      value={code}
      onChange={(value) => setCode(value)}
      extensions={[python(), EditorView.lineWrapping]}
      className="text-sm font-semibold"
    />
  )
}


const ResponsiveGridLayout = WidthProvider(Responsive);

interface EntityEditorProps {
  transforms: any
  activeEntity?: any
  refetchEntity: () => void
  showTaskbar?: boolean
}

export default function EntityEditor({ transforms, activeEntity, refetchEntity, showTaskbar = true }: EntityEditorProps) {
  const [code, setCode] = useState(activeEntity?.source)
  useEffect(() => {
    if (activeEntity?.source) setCode(activeEntity.source)
  }, [activeEntity?.source])
  // const [updateEntityById] = useUpdateEntityByIdMutation()

  const [isEntityDraggable, setEntityDraggable] = useState<boolean>(false);
  const [textWrap, setTextWrap] = useState<string>('whitespace-pre-line')
  const [activeOption, setActiveOption] = useState<any>({ label: 'Select transform...', icon: 'edit' });
  const dropdownRef: any = useRef(200)
  const [query, setQuery] = useState('');

  useEffect(() => {
    setActiveOption({ label: 'Select transform...', icon: 'edit' })
  }, [transforms])

  const filteredTransforms = query === '' || query?.includes('Select transform') || query === null
    ? transforms
    : transforms.filter((transform: any) => {
      return transform.label.toLowerCase().includes(query?.toLowerCase())
    })

  return (
    <>
      <ResponsiveGridLayout
        compactType={null}
        className="w-full h-full absolute"
        rowHeight={20}
        maxRows={150}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 50, md: 50, sm: 20, xs: 18, xxs: 16 }}
        containerPadding={[0, 10]}
        isDraggable={isEntityDraggable}
        isResizable={true}
        allowOverlap={true}
      >
        <div data-grid={{
          x: 38,
          y: 0,
          w: 14,
          h: 16,
          maxH: 24,
          minH: 1,
          maxW: 50,
          minW: 2,
        }} key="a" className="overflow-hidden rounded-sm border-mirage-3200/0 shadow-lg border z-10 backdrop-blur-sm from-black/35 to-black/20  bg-gradient-to-br from-50% flex flex-col h-full">
          <div className="  border-mirage-800/10 border overflow-y-scroll h-full ">
            <h2 className="text-slate-350 px-3 py-3 font-display text-lg">Migrations</h2>
          </div>
        </div>
        <div
          className="border border-mirage-950 z-10 backdrop-blur-sm shadow-md  from-70% flex flex-col h-full"
          key="editor"
          data-grid={{
            x: 0,
            y: 0,
            w: 36,
            h: 29,
            maxH: 30,
            minH: 2,
            maxW: 50,
            minW: 10,
          }}
        >
          <div className="from-black/35 backdrop-blur-sm bg-gradient-to-br from-40% to-black/30 overflow-y-scroll h-full ">
            <CodeEditor editable={showTaskbar} code={code} setCode={setCode} />
          </div>
          {showTaskbar && (
            <>
              <ol className="text-sm flex select-none from-cod-800/20 bg-gradient-to-r from-10% to-cod-800/30 relative pr-2  ">
                <li className="flex  mr-auto w-full">

                  <div class="flex justify-between items-center w-full text-slate-400 ">
                    <div
                      class="flex items-center py-2"
                      title="Run transform"
                    >
                      <CommandLineIcon class="h-6 mx-2 text-success-500" />
                      <span class="text-nowrap mr-4 ">{!activeEntity?.label?.includes('Select entity') && (activeEntity?.label ?? '')} Console</span>
                    </div>
                  </div>
                </li>
                <li class="flex py-2 ">
                  <div class="flex justify-between items-center w-full text-slate-400 gap-x-2">
                    <button
                      onClick={() => {
                        if (textWrap === 'whitespace-pre-line') setTextWrap('text-nowrap')
                        else setTextWrap('whitespace-pre-line')
                      }}
                    >
                      <Icon
                        icon="text-wrap"
                        className={`w-5 h-5 -mb-0.5 mx-1 ${textWrap === 'text-nowrap' ? 'text-slate-500 hover:text-slate-400' : 'text-slate-300'}`}
                      />
                    </button>
                    <button
                      onClick={() => setEntityDraggable(!isEntityDraggable)}
                      class="text-slate-500 hover:text-slate-400"
                    >
                      {isEntityDraggable ? (
                        <LockOpenIcon class="w-5 h-5" />
                      ) : (
                        <LockClosedIcon class="w-5 h-5" />
                      )}
                    </button>

                  </div>
                </li>
              </ol>
              <ResizableBox axis={'y'} className="rounded-sm shadow-lg  backdrop-blur-sm from-70% from-black/30 to-black/25  bg-gradient-to-bl flex flex-col " height={150} minConstraints={[Infinity, 50]} maxConstraints={[Infinity, 2000]}
                handle={
                  <div class=" react-grid-item h-5 absolute right-0 top-0 hover:cursor-ns-resize">
                    <span class=" react-resizable-handle react-resizable-handle-ne" />
                  </div>
                }
                resizeHandles={['ne']}>
                <textarea disabled={true} readOnly={true} class={`${textWrap} text-slate-300/80 text-sm h-full overflow-y-scroll backdrop-blur-sm from-cod-800/10 bg-transparent to-cod-800/10  bg-gradient-to-br from-50% border-mirage-100/0 px-2 pt-1.5`} value={`No output, try running a transform`}>

                </textarea>
              </ResizableBox>
            </>
          )}
        </div>

      </ResponsiveGridLayout >
    </>
  );
}

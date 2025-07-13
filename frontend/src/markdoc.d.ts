declare module "*.md" {
  import type { RenderableTreeNode } from '@markdoc/markdoc'
  const Node: RenderableTreeNode
  export default Node
}
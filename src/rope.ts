// Rope Data Structure Implementation in TypeScript, suitable for use in a text editor

type RopeNode = RopeLeaf | RopeInternal;

class RopeLeaf {
    public value: string;

    constructor(value: string) {
        this.value = value;
    }

    get length(): number {
        return this.value.length;
    }
}

class RopeInternal {
    public left: RopeNode;
    public right: RopeNode;
    public weight: number;

    constructor(left: RopeNode, right: RopeNode) {
        this.left = left;
        this.right = right;
        this.weight = Rope.getNodeLength(left);
    }
}

export class Rope {
  private root: RopeNode

  constructor(str: string = "", chunkSize = 512) {
    this.root = this.buildRope(str, chunkSize)
  }

  // Helper to get length of any node
  public static getNodeLength(node: RopeNode): number {
    if (node instanceof RopeLeaf) {
      return node.length
    } else if (node instanceof RopeInternal) {
      return Rope.getNodeLength(node.left) + Rope.getNodeLength(node.right)
    }
    return 0
  }

  private buildRope(str: string, chunkSize: number): RopeNode {
    if (str.length <= chunkSize) {
      return new RopeLeaf(str)
    }
    const mid = Math.floor(str.length / 2)
    const left = this.buildRope(str.slice(0, mid), chunkSize)
    const right = this.buildRope(str.slice(mid), chunkSize)
    return new RopeInternal(left, right)
  }

  public get length(): number {
    return Rope.getNodeLength(this.root)
  }

  public toString(): string {
    const result: string[] = []
    this.collect(this.root, result)
    return result.join("")
  }

  private collect(node: RopeNode, result: string[]): void {
    if (node instanceof RopeLeaf) {
      result.push(node.value)
    } else if (node instanceof RopeInternal) {
      this.collect(node.left, result)
      this.collect(node.right, result)
    }
  }

  public charAt(index: number): string {
    if (index < 0 || index >= this.length) {
      throw new RangeError("Index out of bounds")
    }
    return this.charAtNode(this.root, index)
  }

  private charAtNode(node: RopeNode, index: number): string {
    if (node instanceof RopeLeaf) {
      return node.value.charAt(index)
    } else if (node instanceof RopeInternal) {
      if (index < node.weight) {
        return this.charAtNode(node.left, index)
      } else {
        return this.charAtNode(node.right, index - node.weight)
      }
    }
    throw new Error("Invalid node")
  }

  // Split the rope at the given index, returning two ropes [left, right]
  public split(index: number): [Rope, Rope] {
    const [leftNode, rightNode] = this.splitNode(this.root, index)
    return [this.ropeFromNode(leftNode), this.ropeFromNode(rightNode)]
  }

  private splitNode(
    node: RopeNode,
    index: number
  ): [RopeNode | null, RopeNode | null] {
    if (node == null) return [null, null]

    if (node instanceof RopeLeaf) {
      if (index <= 0) return [null, node]
      if (index >= node.length) return [node, null]
      return [
        new RopeLeaf(node.value.slice(0, index)),
        new RopeLeaf(node.value.slice(index)),
      ]
    } else if (node instanceof RopeInternal) {
      if (index < node.weight) {
        const [leftL, leftR] = this.splitNode(node.left, index)
        return [leftL, this.joinNodes(leftR, node.right)]
      } else {
        const [rightL, rightR] = this.splitNode(node.right, index - node.weight)
        return [this.joinNodes(node.left, rightL), rightR]
      }
    }
    throw new Error("Invalid node")
  }

  // Join helper for split
  private joinNodes(
    left: RopeNode | null,
    right: RopeNode | null
  ): RopeNode | null {
    if (!left) return right
    if (!right) return left
    return new RopeInternal(left, right)
  }

  private ropeFromNode(node: RopeNode | null): Rope {
    const rope = new Rope()
    if (node) rope.root = node
    return rope
  }

  // Concatenate another rope
  public concat(other: Rope): Rope {
    return this.ropeFromNode(new RopeInternal(this.root, other.root))
  }

  // Insert a string at the given index
  public insert(index: number, str: string): Rope {
    const [left, right] = this.split(index)
    return left.concat(new Rope(str)).concat(right)
  }

  // Delete text from start (inclusive) to end (exclusive)
  public delete(start: number, end: number): Rope {
    const [left, temp] = this.split(start)
    const [, right] = temp.split(end - start)
    return left.concat(right)
  }

  // Get substring from start (inclusive) to end (exclusive)
  public substring(start: number, end?: number): string {
    if (end === undefined) end = this.length
    if (start < 0 || end > this.length || start > end) {
      throw new RangeError("Invalid substring range")
    }
    const [left, right] = this.split(start)
    const [middle] = right.split(end - start)
    return middle.toString()
  }

  // For text editor: Replace range [start, end) with newText
  public replace(start: number, end: number, newText: string): Rope {
    return this.delete(start, end).insert(start, newText)
  }
}

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import EmojiItem from "@/components/miro/items/EmojiItem";
import { BoardItem } from "@/lib/api/miroApi";

function makeItem(overrides: Partial<BoardItem> = {}): BoardItem {
  return {
    id: "e1",
    board_id: "b1",
    type: "emoji",
    x: 0,
    y: 0,
    width: 64,
    height: 64,
    style: {},
    content: "🎉",
    z_index: 0,
    is_deleted: false,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("EmojiItem", () => {
  test("renders content emoji", () => {
    const onSelect = jest.fn();
    render(
      <EmojiItem item={makeItem({ content: "⭐" })} isSelected={false} onSelect={onSelect} onUpdate={jest.fn()} />
    );
    expect(screen.getByRole("img", { name: "⭐" })).toBeInTheDocument();
  });

  test("falls back when content empty", () => {
    render(
      <EmojiItem item={makeItem({ content: "" })} isSelected={false} onSelect={jest.fn()} onUpdate={jest.fn()} />
    );
    expect(screen.getByRole("img", { name: "🙂" })).toBeInTheDocument();
  });
});

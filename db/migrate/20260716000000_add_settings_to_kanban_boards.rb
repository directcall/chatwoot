class AddSettingsToKanbanBoards < ActiveRecord::Migration[7.1]
  def change
    add_column :kanban_boards, :settings, :jsonb, default: {}, null: false
    add_column :kanban_columns, :outcome, :string, default: 'open', null: false
  end
end

import type { FC, MouseEventHandler } from 'react'

interface Props {
  onRemoveActiveQuestClicked: MouseEventHandler<HTMLButtonElement>
  onRemoveAllHandlerClicked: MouseEventHandler<HTMLButtonElement>
}

const RemoveButtons: FC<Props> = ({
  onRemoveActiveQuestClicked,
  onRemoveAllHandlerClicked
}) => (
  <>
    <button type="button" onClick={onRemoveActiveQuestClicked}>
      Remove active quest
    </button>
    <button type="button" onClick={onRemoveAllHandlerClicked}>
      Remove all quests
    </button>
  </>
)

export default RemoveButtons

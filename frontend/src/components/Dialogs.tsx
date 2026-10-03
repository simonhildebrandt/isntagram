import { useEffect, useRef, useState } from 'react'
import {
  AlertDialog, AlertDialogBody, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay,
  Button, FormControl, FormErrorMessage, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay,
} from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { errorMessage } from '../api/client'

interface ConfirmProps {
  isOpen: boolean
  onClose: () => void
  title: string
  body: ReactNode
  confirmLabel: string
  onConfirm: () => Promise<unknown>
}

// Destructive confirmation; stays open and shows the error if the action fails.
export function ConfirmDialog({ isOpen, onClose, title, body, confirmLabel, onConfirm }: ConfirmProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (isOpen) setError(null) }, [isOpen])

  const confirm = async () => {
    setBusy(true)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog isOpen={isOpen} onClose={onClose} leastDestructiveRef={cancelRef} isCentered>
      <AlertDialogOverlay>
        <AlertDialogContent mx={4}>
          <AlertDialogHeader fontSize="18px">{title}</AlertDialogHeader>
          <AlertDialogBody color="#52525b">{body}{error && <FormControl isInvalid><FormErrorMessage>{error}</FormErrorMessage></FormControl>}</AlertDialogBody>
          <AlertDialogFooter gap={2}>
            <Button ref={cancelRef} variant="outline" colorScheme="gray" onClick={onClose}>Cancel</Button>
            <Button colorScheme="orange" bg="#c2410c" onClick={confirm} isLoading={busy}>{confirmLabel}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  )
}

interface NameProps {
  isOpen: boolean
  onClose: () => void
  title: string
  initial?: string
  submitLabel: string
  onSubmit: (name: string) => Promise<unknown>
}

export function NameDialog({ isOpen, onClose, title, initial = '', submitLabel, onSubmit }: NameProps) {
  const [name, setName] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (isOpen) { setName(initial); setError(null) } }, [isOpen, initial])

  const submit = async () => {
    setBusy(true)
    try {
      await onSubmit(name.trim())
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent mx={4} as="form" onSubmit={(e: React.FormEvent) => { e.preventDefault(); submit() }}>
        <ModalHeader fontSize="18px">{title}</ModalHeader>
        <ModalBody>
          <FormControl isInvalid={!!error}>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Folder name" autoFocus />
            <FormErrorMessage>{error}</FormErrorMessage>
          </FormControl>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="outline" colorScheme="gray" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={busy} isDisabled={!name.trim()}>{submitLabel}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

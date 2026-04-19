'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Upload,
  FolderPlus,
  File,
  Folder,
  MoreVertical,
  Download,
  Trash2,
  ChevronRight,
  Search,
  FileText,
  FileImage,
  FileArchive,
  FileCode,
  Lock,
  Shield,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface FileItem {
  id: string
  filename: string
  originalName: string
  path: string
  size: number
  mimeType: string
  createdAt: string
  uploadedBy: { id: string; name: string }
  customer?: { id: string; name: string }
  folder?: { id: string; name: string; isProtected: boolean }
}

interface FolderItem {
  id: string
  name: string
  isProtected: boolean
  createdById: string
  createdBy: { id: string; name: string }
  _count: {
    files: number
    children: number
  }
}

interface BreadcrumbPath {
  id: string | null
  name: string
}

interface UserInfo {
  id: string
  role: string
  companyRole?: string
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [currentFolderData, setCurrentFolderData] = useState<FolderItem | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbPath[]>([{ id: null, name: 'Datenablage' }])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderProtected, setNewFolderProtected] = useState(false)
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)

  // Load user info to check permissions
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUserInfo(data)
        }
      } catch (error) {
        console.error('Fehler beim Laden der Benutzerinformationen:', error)
      }
    }
    loadUserInfo()
  }, [])

  const canManageProtected = useCallback(() => {
    if (!userInfo) return false
    // SUPERADMIN or ADMIN global role
    if (userInfo.role === 'SUPERADMIN' || userInfo.role === 'ADMIN') return true
    // Company roles: OWNER, ADMIN, MANAGER
    if (userInfo.companyRole && ['OWNER', 'ADMIN', 'MANAGER'].includes(userInfo.companyRole)) return true
    return false
  }, [userInfo])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const folderParam = currentFolder ? `?parentId=${currentFolder}` : ''
      const fileParam = currentFolder ? `?folderId=${currentFolder}` : ''
      
      const [foldersRes, filesRes] = await Promise.all([
        fetch(`/api/folders${folderParam}`),
        fetch(`/api/files${fileParam}`)
      ])

      if (foldersRes.ok) {
        const foldersData = await foldersRes.json()
        setFolders(foldersData)
      }

      if (filesRes.ok) {
        const filesData = await filesRes.json()
        setFiles(filesData)
      }

      // Load current folder data if we're in a subfolder
      if (currentFolder) {
        const folderRes = await fetch(`/api/folders/${currentFolder}`)
        if (folderRes.ok) {
          const folderData = await folderRes.json()
          setCurrentFolderData(folderData)
        }
      } else {
        setCurrentFolderData(null)
      }
    } catch (error) {
      console.error('Fehler beim Laden:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentFolder])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles?.length) return

    setIsUploading(true)
    try {
      for (const file of Array.from(selectedFiles)) {
        const formData = new FormData()
        formData.append('file', file)
        if (currentFolder) {
          formData.append('folderId', currentFolder)
        }

        await fetch('/api/files', {
          method: 'POST',
          body: formData
        })
      }
      loadData()
    } catch (error) {
      console.error('Fehler beim Hochladen:', error)
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName,
          parentId: currentFolder,
          isProtected: newFolderProtected
        })
      })

      if (res.ok) {
        setNewFolderName('')
        setNewFolderProtected(false)
        setShowNewFolderDialog(false)
        loadData()
      }
    } catch (error) {
      console.error('Fehler beim Erstellen des Ordners:', error)
    }
  }

  const navigateToFolder = async (folderId: string | null, folderName?: string) => {
    if (folderId === null) {
      setBreadcrumbs([{ id: null, name: 'Datenablage' }])
    } else if (folderName) {
      const existingIndex = breadcrumbs.findIndex(b => b.id === folderId)
      if (existingIndex >= 0) {
        setBreadcrumbs(breadcrumbs.slice(0, existingIndex + 1))
      } else {
        setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }])
      }
    }
    setCurrentFolder(folderId)
  }

  const handleDeleteFile = async (fileId: string, isInProtectedFolder: boolean) => {
    if (isInProtectedFolder && !canManageProtected()) {
      alert('Dateien in geschuetzten Ordnern koennen nur von Administratoren oder Managern geloescht werden.')
      return
    }

    if (!confirm('Datei wirklich loeschen?')) return

    try {
      const res = await fetch(`/api/files/${fileId}`, { method: 'DELETE' })
      if (res.ok) {
        loadData()
      } else {
        const data = await res.json()
        alert(data.error || 'Fehler beim Loeschen')
      }
    } catch (error) {
      console.error('Fehler beim Loeschen:', error)
    }
  }

  const handleDeleteFolder = async (folder: FolderItem) => {
    // Check if user can delete this folder
    if (folder.isProtected && !canManageProtected()) {
      alert('Geschuetzte Ordner koennen nur von Administratoren oder Managern geloescht werden.')
      return
    }

    // Check if user is creator or manager
    const isCreator = userInfo?.id === folder.createdById
    if (!isCreator && !canManageProtected()) {
      alert('Sie koennen nur Ihre eigenen Ordner loeschen.')
      return
    }

    if (!confirm(`Ordner "${folder.name}" und alle enthaltenen Dateien wirklich loeschen?`)) return

    try {
      const res = await fetch(`/api/folders/${folder.id}`, { method: 'DELETE' })
      if (res.ok) {
        loadData()
      } else {
        const data = await res.json()
        alert(data.error || 'Fehler beim Loeschen')
      }
    } catch (error) {
      console.error('Fehler beim Loeschen:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImage className="h-5 w-5 text-green-500" />
    if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />
    if (mimeType.includes('zip') || mimeType.includes('archive')) return <FileArchive className="h-5 w-5 text-yellow-500" />
    if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('html')) return <FileCode className="h-5 w-5 text-purple-500" />
    return <File className="h-5 w-5 text-muted-foreground" />
  }

  const filteredFiles = files.filter(file =>
    file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const isCurrentFolderProtected = currentFolderData?.isProtected || false

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Datenablage</h1>
            <p className="text-muted-foreground">
              Dateien und Dokumente verwalten
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Neuer Ordner
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neuen Ordner erstellen</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="folderName">Ordnername</Label>
                    <Input
                      id="folderName"
                      placeholder="Ordnername eingeben"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    />
                  </div>
                  
                  {canManageProtected() && (
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="protected" className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Geschuetzter Ordner
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Nur Administratoren und Manager koennen diesen Ordner und dessen Dateien loeschen
                        </p>
                      </div>
                      <Switch
                        id="protected"
                        checked={newFolderProtected}
                        onCheckedChange={setNewFolderProtected}
                      />
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
                      Abbrechen
                    </Button>
                    <Button onClick={handleCreateFolder}>
                      Erstellen
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button asChild disabled={isUploading}>
              <label className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? 'Wird hochgeladen...' : 'Hochladen'}
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbs.map((crumb, index) => (
                      <BreadcrumbItem key={crumb.id || 'root'}>
                        {index > 0 && <BreadcrumbSeparator><ChevronRight className="h-4 w-4" /></BreadcrumbSeparator>}
                        <BreadcrumbLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            navigateToFolder(crumb.id)
                          }}
                          className={index === breadcrumbs.length - 1 ? 'font-medium' : ''}
                        >
                          {crumb.name}
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
                {isCurrentFolderProtected && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Lock className="h-4 w-4 text-amber-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Geschuetzter Ordner - Nur Admins/Manager koennen loeschen</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Suchen..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Folder className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Dieser Ordner ist leer</p>
                <p className="text-sm">Laden Sie Dateien hoch oder erstellen Sie einen Ordner</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Groesse</TableHead>
                    <TableHead>Erstellt von</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFolders.map((folder) => (
                    <TableRow
                      key={folder.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigateToFolder(folder.id, folder.name)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Folder className="h-5 w-5 text-blue-500" />
                            {folder.isProtected && (
                              <Lock className="h-3 w-3 text-amber-500 absolute -top-1 -right-1" />
                            )}
                          </div>
                          <span className="font-medium">{folder.name}</span>
                          {folder.isProtected && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Shield className="h-4 w-4 text-amber-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Geschuetzter Ordner</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {folder._count.files} Dateien, {folder._count.children} Ordner
                      </TableCell>
                      <TableCell>{folder.createdBy?.name || '-'}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteFolder(folder)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Loeschen
                              {folder.isProtected && !canManageProtected() && (
                                <Lock className="ml-2 h-3 w-3" />
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFileIcon(file.mimeType)}
                          <span>{file.originalName || file.filename}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatFileSize(file.size)}
                      </TableCell>
                      <TableCell>{file.uploadedBy.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(file.createdAt).toLocaleDateString('de-DE')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <a href={file.path} download={file.originalName || file.filename}>
                                <Download className="mr-2 h-4 w-4" />
                                Herunterladen
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteFile(file.id, isCurrentFolderProtected)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Loeschen
                              {isCurrentFolderProtected && !canManageProtected() && (
                                <Lock className="ml-2 h-3 w-3" />
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}

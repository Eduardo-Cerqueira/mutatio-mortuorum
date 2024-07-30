// MIT License
//
// Copyright (c) 2023 Matthew D
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import fs, { PathLike } from 'fs';
import path from 'path';

//Open issues:
// ensure support for multi-chunk VPK's with any number of '_'-separated segments (file name contains "_dir") (and word 'english'?)
//   auto-chunk at a set threshold for creation (people having issues with around 4GB mark?)

/**
 * A VPK package
 */
export class Vpk {
    /** The default encoding for file paths */
    static readonly DEFAULT_FILE_PATH_ENCODING: string = 'utf-8';

    /** A constant header component part of all v1 and v2 Valve VPKs */
    static readonly MAGIC: number = 0x55aa1234;

    /** The target version of the VPK (1|2) */
    private _version: number;

    /** The length of the VPK header, this varies based on VPK version (v1 = 12, v2 = 28) */
    // @ts-ignore
    private _headerLength: number;

    /** The file tree that links the contained files with the structure: root -> file ext -> relative path from VPK root -> file name + data/path  */
    private _tree: object;

    constructor() {
        this._version = 2;
        this._headerLength = 28;
        this._tree = {};
    }

    /**
     * Get the target version (1|2) of the VPK
     * @returns the target VPK version
     */
    getVersion(): number {
        return this._version;
    }

    /**
     * Set the target version (1|2) of the VPK
     * @param version the target version
     */
    setVersion(version: number): void {
      if (version < 1 || version > 2)
          throw new Error('Version must be 1 or 2.');

      this._version = version;

      if (version === 1)
          this._headerLength = 12;
      else
          this._headerLength = 28;
    }

    /**
     * Get all files currently added to the VPK
     * @returns all files currently added to the VPK
     */
    getFiles(): FileInPak[] {
        const fileArr: FileInPak[] = [];
        const tree: any = (this._tree as any);

        for(const ext in tree) {
            for (const relPath in tree[ext]) {
                const leafArr = tree[ext][relPath] as TreeLeaf[]
                for (let i = 0; i < leafArr.length; i++) {
                    const leaf: TreeLeaf = leafArr[i];
                    fileArr.push({ extension: ext, relPath: relPath.trim(), extlessFileName: leaf.fileName,
                        dataSource: (leaf.absoluteFilePath ? leaf.absoluteFilePath : (leaf.fileChunk ? leaf.fileChunk : leaf.fileData))
                    } as FileInPak);
                }
            }
        }

        return fileArr;
    }

    /**
     * Get a specific file from the VPK
     * @param extension the file extension
     * @param relPath the relative path of the directory holding the file
     * @param extlessFileName the file name minus the extension
     * @returns The file or null if not found
     */
    getFile(extension: string, relPath: string, extlessFileName: string): FileInPak | null {
        const tree: any = (this._tree as any);

        let fixedRelPath: string = relPath.trim();
        if (fixedRelPath === '')
            fixedRelPath = ' ';

        if (tree[extension]) {
            if (tree[extension][fixedRelPath]){
                const leafArr = tree[extension][fixedRelPath] as TreeLeaf[];
                for (let i = 0; i < leafArr.length; i++) {
                    const leaf: TreeLeaf = leafArr[i];
                    if (leaf.fileName === extlessFileName)
                        return { extension: extension, relPath: fixedRelPath.trim(), extlessFileName: leaf.fileName,
                            dataSource: (leaf.absoluteFilePath ? leaf.absoluteFilePath : (leaf.fileChunk ? leaf.fileChunk : leaf.fileData))
                        } as FileInPak;
                }
            }
        }

        return null;
    }

    /**
     * Remove a specific file from the VPK
     * @param extension the file extension
     * @param relPath the relative path of the directory holding the file
     * @param extlessFileName the file name minus the extension
     */
    removeFile(extension: string, relPath: string, extlessFileName: string): void {
        const tree: any = (this._tree as any);

        let fixedRelPath: string = relPath.trim();
        if (fixedRelPath === '')
            fixedRelPath = ' ';

        if (tree[extension]) {
            if (tree[extension][fixedRelPath]){
                const leafArr = tree[extension][fixedRelPath] as TreeLeaf[];
                let targetIndex: number = -1;
                for (let i = 0; i < leafArr.length; i++) {
                    if (leafArr[i].fileName === extlessFileName) {
                        targetIndex = i;
                        break;
                    }
                }

                if (targetIndex > -1)
                    leafArr.splice(targetIndex, 1);
            }
        }
    }

    /**
     * Get the pak'ed file index from a VPK file
     * @param absFilePath the absolute path to the file
     * @param pathEncoding the optional file path encoding to use (defaults to utf-8)
     * @returns an array of relative paths of any pak'ed files and their metadata
     */
    static indexFromFile(absFilePath: string, pathEncoding: string = Vpk.DEFAULT_FILE_PATH_ENCODING): IndexEntry[] {
        validateReadFileOrDirectoryPath(absFilePath);

        const indexFromFileResult: IndexFromFileResult = indexFromFileInternal(absFilePath, pathEncoding as BufferEncoding);
        const fileIndexTree = indexFromFileResult.fileIndexTree as any;

        const retArr: IndexEntry[] = [];
        for (const ext in fileIndexTree) {
            for (const relPath in fileIndexTree[ext]) {
                for (let i = 0; i < fileIndexTree[ext][relPath].length; i++) {
                    const leaf = fileIndexTree[ext][relPath][i] as IndexTreeLeaf;
                    retArr.push({
                        relPath: relPath.trim() !== '' ? relPath + '/' + leaf.fileName + '.' + ext : leaf.fileName + '.' + ext,
                        metadata: leaf.metadata
                    } as IndexEntry);
                }
            }
        }

        return retArr;
    }

    /**
     * Save the contents (extract) the VPK to a directory in the file system. Existing files will be overwritten.
     * @param absDirPath The absolute path to the target directory
     * @param createParentDirs True to create the necessary parent directory structure if not present, false to error out if the proper parent directory structure doesn't exist
     */
    extractToDirectory(absDirPath: string, createParentDirs: boolean = true): void {
        if (!fs.existsSync(absDirPath)) {
            if (createParentDirs)
                fs.mkdirSync(absDirPath, { recursive: true });
            else
                throw new Error(`The directory at ${absDirPath} is inaccessible or does not exist.`);
        }

        const fileArr: FileInPak[] = this.getFiles();
        for (let i = 0; i < fileArr.length; i++) {
            const file: FileInPak = fileArr[i];
            const absTargetFilePath: string = path.join(absDirPath, file.relPath.trim(), file.extlessFileName + '.' + file.extension);
            if (typeof file.dataSource === 'string')
                writeFileFromFile(absTargetFilePath, file.dataSource as string);
            else if ((file.dataSource as any)['absolutePath'])
                writeFileFromFileChunk(absTargetFilePath, file.dataSource as FileChunk);
            else
                writeFileFromBuffer(absTargetFilePath, file.dataSource as Buffer);
        }
    }
}

/**
 * Given a starting directory path, calling an optional callback for that directory then performs a depth-first traversal of any contained folders,
 * calling an optional callback per non-directory file encountered
 * @param dirPath the absolute path of the start directory
 * @param directoryCallback an optional callback to run when a directory is entered. Accepts the absolute path to said directory as the sole parameter.
 * @param fileCallback an optional callback to run when a file is encountered. Accepts the absolute path to said file as the sole parameter.
 */
const walkDir = (dirPath: string, directoryCallback?: (path: string) => void, fileCallback?: (path: string) => void) => {
    if (directoryCallback)
        directoryCallback(dirPath);

    fs.readdirSync(dirPath).forEach((f: string) => {
        const itemPath: string = path.join(dirPath, f);
        const isDirectory: boolean = fs.statSync(itemPath).isDirectory();
        if (isDirectory) {
            walkDir(itemPath, directoryCallback, fileCallback);
        } else {
            if (fileCallback)
                fileCallback(itemPath);
        }
    });
};

/**
 * Validates the given directory or file path for read access
 * @param dirPath the absolute path to the target directory
 */
const validateReadFileOrDirectoryPath = (dirPath: string) => {
    try {
        fs.accessSync(dirPath, fs.constants.R_OK);
    } catch {
        throw new Error(`The directory or file at ${dirPath} is inaccessible or does not exist.`);
    }
};

/**
 * Retrieve the VPK file index tree
 * @param fd the file descriptor for the target VPK file
 * @param headerLength the length of the header (version-dependent)
 * @param treeLength the length of the VPK file tree
 * @param maxIndex the max byte index to scan
 * @param stringEncoding the string encoding used in the file
 * @returns the index tree with the structure: root -> file ext -> relative path from VPK root -> file name + metadata
 */
const getFileIndexTree = (fd: number, headerLength: number, treeLength: number, maxIndex: number, stringEncoding: BufferEncoding): object => {
    let pakPos: number = headerLength;

    const tree: any = {};
    while (true) {
        if (pakPos > maxIndex)
            throw new Error('Error parsing index (out of bounds)');

        const extReadResult: FileStringReadResult = readNextStringFromFile(fd, pakPos, stringEncoding);
        const ext: string = extReadResult.result;
        pakPos += extReadResult.bytesRead;

        if (ext === '')
            break;

        tree[ext] = {};

        while(true) {
            const pathReadResult: FileStringReadResult = readNextStringFromFile(fd, pakPos, stringEncoding);
            const relPath: string = pathReadResult.result;
            pakPos += pathReadResult.bytesRead;

            if (relPath === '')
                break;

            tree[ext][relPath] = [];

            while (true) {
                const nameReadResult: FileStringReadResult = readNextStringFromFile(fd, pakPos, stringEncoding);
                const name: string = nameReadResult.result;
                pakPos += nameReadResult.bytesRead;

                if (name === '')
                    break;

                let sourceBuf: Buffer = Buffer.alloc(18);
                pakPos += fs.readSync(fd, sourceBuf, 0, 18, pakPos);

                const crc32: number = sourceBuf.readUInt32LE(0);
                const preloadLength: number = sourceBuf.readUInt16LE(4);
                let archiveIndex: number = sourceBuf.readUInt16LE(6);
                const archiveOffset: number = sourceBuf.readUInt32LE(8);
                const fileLength: number = sourceBuf.readUInt32LE(12);
                const suffix: number = sourceBuf.readUInt16LE(16);

                if (suffix !== 0xffff)
                    throw new Error('Error while parsing index');

                if (archiveIndex === 0x7fff)
                    archiveIndex = headerLength + treeLength + archiveOffset;

                tree[ext][relPath].push({ fileName: name, metadata: {
                    crc32: crc32,
                    preloadLength: preloadLength,
                    archiveIndex: archiveIndex,
                    archiveOffset: archiveOffset + treeLength + headerLength,
                    fileLength: fileLength,
                    suffix: suffix
                }} as IndexTreeLeaf);
            }
        }
    }

    return tree;
};

/**
 * Reads the next string from a file (until the next null terminator)
 * @param fd the file descriptor
 * @param position the start position to read from
 * @param stringEncoding the string encoding used in the file
 * @returns a result containing the string that was read and how many bytes were read during the read
 */
const readNextStringFromFile = (fd: number, position: number, stringEncoding: BufferEncoding): FileStringReadResult => {
    const nullTerm = new Uint8Array([0]);
    const retVal: string[] = [];

    let totalBytesRead: number = 0;

    const sourceBuf: Buffer = Buffer.alloc(1);
    let bytesRead: number = fs.readSync(fd, sourceBuf, 0, 1, position);
    while (bytesRead !== 0) {
        position += bytesRead;
        totalBytesRead += bytesRead;
        if (sourceBuf[0] == nullTerm[0])
            break;
        retVal.push(sourceBuf.toString(stringEncoding))
        bytesRead = fs.readSync(fd, sourceBuf, 0, 1, position);
    }

    return { result: retVal.join(''), bytesRead: totalBytesRead };
};

/**
 * Reads the header from a VPK file and generates the file index tree
 * @param absFilePath the absolute path to the target file
 * @param pathEncoding the file path encoding to use
 * @returns a result containing the file index tree and the VPK version
 */
const indexFromFileInternal = (absFilePath: string, pathEncoding: BufferEncoding): IndexFromFileResult => {
    let pakPos: number = 0;
    let sourceBuf: Buffer = Buffer.alloc(12);
    let pakFd: number | undefined = undefined;
    try {
        pakFd = fs.openSync(absFilePath as PathLike, 'r');
        pakPos += fs.readSync(pakFd, sourceBuf, 0, 12, 0);

        const magic: number = sourceBuf.readUInt32LE(0);
        if (magic !== Vpk.MAGIC)
            throw new Error('File missing header magic');

        const version: number = sourceBuf.readUInt32LE(4);

        if (version === 0x00030002)
            throw new Error('Respawn uses a customized VPK format which this library does not support.');

        const treeLength: number = sourceBuf.readUInt32LE(8);

        let headerLength: number = 12;

        let vpkV2Metadata: VpkV2Metadata | undefined = undefined;
        if (version === 2) {
            headerLength = 28;
            sourceBuf = Buffer.alloc(16);
            pakPos += fs.readSync(pakFd, sourceBuf, 0, 16, 12);

            const embedChunkLength: number = sourceBuf.readUInt32LE(0);
            const chunkHashesLength: number = sourceBuf.readUInt32LE(4);
            const hashesLength: number = sourceBuf.readUInt32LE(8);
            const signatureLength: number = sourceBuf.readUInt32LE(12);

            if (hashesLength !== 48)
                throw new Error('Header hashes length mismatch');

            pakPos += treeLength + embedChunkLength + chunkHashesLength;

            sourceBuf = Buffer.alloc(16);

            pakPos += fs.readSync(pakFd, sourceBuf, 0, 16, pakPos);
            const treeChecksum: string = sourceBuf.toString('hex');

            pakPos += fs.readSync(pakFd, sourceBuf, 0, 16, pakPos);
            const chunkHashesChecksum: string = sourceBuf.toString('hex');

            pakPos += fs.readSync(pakFd, sourceBuf, 0, 16, pakPos);
            const fileChecksum: string = sourceBuf.toString('hex');

            vpkV2Metadata = {
                embedChunkLength: embedChunkLength,
                chunkHashesLength: chunkHashesLength,
                hashesLength: hashesLength,
                signatureLength: signatureLength,
                treeChecksum: treeChecksum,
                chunkHashesChecksum: chunkHashesChecksum,
                fileChecksum: fileChecksum
            } as VpkV2Metadata;
        }

        const fileIndexTree: any = getFileIndexTree(pakFd, headerLength, treeLength, (treeLength + headerLength), pathEncoding);
        fs.closeSync(pakFd);

        return { fileIndexTree: fileIndexTree, vpkVersion: version, vpkTreeLength: treeLength, vpkV2Metadata: vpkV2Metadata } as IndexFromFileResult;
    } catch (e) {
        if (pakFd)
            fs.closeSync(pakFd);
        throw e;
    }
};

/**
 * Write to a file on disk with data sourced from a file elsewhere on disk (any existing file will be overwritten)
 * @param absTargetFilePath the absolute path to the file to write/create
 * @param absSourceFilePath the absolute path to the source file to read
 */
const writeFileFromFile = (absTargetFilePath: string, absSourceFilePath: string): void => {
    const absTargetDirPath: string = path.dirname(absTargetFilePath);
    if (!fs.existsSync(absTargetDirPath))
        fs.mkdirSync(absTargetDirPath, { recursive: true });

    fs.copyFileSync(absSourceFilePath, absTargetFilePath, fs.constants.COPYFILE_FICLONE);
};

/**
 * Write to a file on disk with data sourced from a chunk of a file elsewhere on disk (any existing file will be overwritten)
 * @param absTargetFilePath the absolute path to the file to write/create
 * @param fileChunk the source file chunk to read
 */
const writeFileFromFileChunk = (absTargetFilePath: string, fileChunk: FileChunk): void => {
    const absTargetDirPath: string = path.dirname(absTargetFilePath);
    if (!fs.existsSync(absTargetDirPath))
        fs.mkdirSync(absTargetDirPath, { recursive: true });

    let targetFd: number | undefined = undefined;
    let sourceFd: number | undefined = undefined;
    try {
        targetFd = fs.openSync(absTargetFilePath as PathLike, 'w');
        sourceFd = fs.openSync(fileChunk.absolutePath as PathLike, 'r');
        let sourcePos: number = fileChunk.offset;

        const sourceBuffer = Buffer.alloc(16000);
        let totalBytesRead: number = 0;
        let bytesRead: number = fs.readSync(sourceFd, sourceBuffer, 0, Math.min(16000, fileChunk.length), sourcePos);
        while (bytesRead !== 0) {
            const trimmedSourceBuffer: Buffer = sourceBuffer.subarray(0, bytesRead);
            fs.writeSync(targetFd, trimmedSourceBuffer);
            totalBytesRead += bytesRead;
            sourcePos += bytesRead;
            bytesRead = fs.readSync(sourceFd, sourceBuffer, 0, Math.min(16000, fileChunk.length - totalBytesRead), sourcePos);
        }
        fs.closeSync(targetFd);
        fs.closeSync(sourceFd);
    } catch (e) {
        if (targetFd)
            fs.closeSync(targetFd);
        if (sourceFd)
            fs.closeSync(sourceFd);
        throw e;
    }
};

/**
 * Write to a file on disk with data sourced from a buffer (any existing file will be overwritten)
 * @param absTargetFilePath the absolute path to the file to write/create
 * @param sourceBuffer the source data buffer to read
 */
const writeFileFromBuffer = (absTargetFilePath: string, sourceBuffer: Buffer): void => {
    const absTargetDirPath: string = path.dirname(absTargetFilePath);
    if (!fs.existsSync(absTargetDirPath))
        fs.mkdirSync(absTargetDirPath, { recursive: true });

    let targetFd: number | undefined = undefined;
    try {
        targetFd = fs.openSync(absTargetFilePath as PathLike, 'w');
        fs.writeSync(targetFd, sourceBuffer);
        fs.closeSync(targetFd);
    } catch (e) {
        if (targetFd)
            fs.closeSync(targetFd);
        throw e;
    }
};

/**
 * Result from reading a string from a VPK file
 */
interface FileStringReadResult {
    /** The string that was read or '' if nothing read */
    result: string,
    /** The number of bytes that was read */
    bytesRead: number
}

/**
 * File metadata for a file in VPK
 */
export interface FileMetadata {
    /** The CRC32 of the file */
    crc32: number,
    preloadLength: number
    archiveIndex: number,
    /**
     * The offset of the file data within the VPK file, relative to the end position of the header data + file index
     * (add the header and tree length to this for the actual position with the VPK file)
     * */
    archiveOffset: number,
    /** The length of the file data in bytes */
    fileLength: number,
    suffix: number
}

/**
 * Holds the additional VPK metadata for v2 paks
 */
interface VpkV2Metadata {
    embedChunkLength: number,
    chunkHashesLength: number,
    hashesLength: number,
    signatureLength: number,
    treeChecksum: string,
    chunkHashesChecksum: string,
    fileChecksum: string,
}

/**
 * A leaf in the VPK tree
 */
interface TreeLeaf {
    /** The name of the file (minus any extension) */
    fileName: string,
    /** The absolute path to the file on disk (if data source from file) */
    absoluteFilePath?: string
    /** The buffer to source the data from (if not from file) */
    fileData?: Buffer
    /** The file chunk (if data source from file and using a file chunk) */
    fileChunk?: FileChunk
}

/**
 * A leaf record within a VPK index tree
 */
interface IndexTreeLeaf {
    /** The file name minux the extension */
    fileName: string,
    /** The file metadata */
    metadata: FileMetadata
}

/**
 * A result to contain a parsed file index from and version number from a VPK file
 */
interface IndexFromFileResult {
    /** The file index tree for the VPK */
    fileIndexTree: any,
    /** The VPK version number */
    vpkVersion: number,
    /** The length of the VPK index tree */
    vpkTreeLength: number,
    /** The v2 metadata (if VPK is v2) */
    vpkV2Metadata?: VpkV2Metadata
}

/**
 * A pak'ed file entry
 */
export interface IndexEntry {
    /** The relative path to the file from the root */
    relPath: string,
    /** The file metadata */
    metadata: FileMetadata
}

/**
 * A (pak'd) file within a VPK
 */
export interface FileInPak {
    /** The file extension */
    extension: string,
    /** The relative path to the file from the root */
    relPath: string,
    /** The file name minus the extension */
    extlessFileName: string,
    /** The data source for the file. Can be an absolute path to another file on disk, a file chunk from a file on disk or a buffer with data. */
    dataSource: String | FileChunk | Buffer
}

/** A chunk of a file on disk */
export interface FileChunk {
    /** The absolute path to the file on disk */
    absolutePath: string,
    /** Where to start reading (the byte offset) the file chunk */
    offset: number,
    /** The length of the file chunk in bytes */
    length: number
}

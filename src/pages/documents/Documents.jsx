import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  Download,
  ExternalLink,
  File,
  FileImage,
  FileText,
  FileVideo,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { subscribeEmployees } from "../../services/employeeService";

import {
  createDocument,
  deleteDocument,
  formatFileSize,
  getDocuments,
} from "../../services/documentService";

function Documents() {
  const { role } = useAuth();
  const isManagement = ["admin", "hr", "manager"].includes(role);
  const fileInputRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [documentName, setDocumentName] = useState("");
  const [category, setCategory] = useState("Other");
  const [description, setDescription] = useState("");

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterEmployee, setFilterEmployee] = useState("All");
  const [employees, setEmployees] = useState([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const categories = [
    "All",
    "Personal",
    "Identity",
    "Employment",
    "Education",
    "Salary",
    "Medical",
    "Other",
  ];

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getDocuments();

      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading documents:", err);

      setError(
        err?.message || "Unable to load documents."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
    if (!isManagement) return undefined;
    return subscribeEmployees((data) => setEmployees(Array.isArray(data) ? data.filter((item) => item.role === "employee" || item.isEmployee === true) : []));
  }, [isManagement]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setSuccess("");

    const maxFileSize = 10 * 1024 * 1024;

    if (file.size > maxFileSize) {
      setSelectedFile(null);

      setError(
        "File size must be less than 10 MB."
      );

      event.target.value = "";

      return;
    }

    setSelectedFile(file);

    if (!documentName) {
      setDocumentName(
        file.name.replace(/\.[^/.]+$/, "")
      );
    }
  };

  const handleRemoveSelectedFile = () => {
    setSelectedFile(null);
    setDocumentName("");
    setDescription("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setError("Please select a file first.");
      return;
    }

    if (!documentName.trim()) {
      setError("Please enter a document name.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setSuccess("");

      const newDocument = await createDocument({
        file: selectedFile,
        name: documentName,
        category,
        description,
      });

      setDocuments((previous) => [
        newDocument,
        ...previous,
      ]);

      setSelectedFile(null);
      setDocumentName("");
      setCategory("Other");
      setDescription("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setSuccess(
        "Document uploaded successfully."
      );
    } catch (err) {
      console.error(
        "Error uploading document:",
        err
      );

      setError(
        err?.message ||
          "Unable to upload document."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (document) => {
    if (!document?.id) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${
        document.name || "this document"
      }"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(document.id);
      setError("");
      setSuccess("");

      await deleteDocument(document.id);

      setDocuments((previous) =>
        previous.filter(
          (item) => item.id !== document.id
        )
      );

      setSuccess(
        "Document deleted successfully."
      );
    } catch (err) {
      console.error(
        "Error deleting document:",
        err
      );

      setError(
        err?.message ||
          "Unable to delete document."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const documentEmployees = useMemo(() => {
    return employees
      .filter((employee) => employee.uid)
      .map((employee) => [employee.uid, `${employee.fullName || employee.name || employee.email}${employee.employeeCode ? ` • ${employee.employeeCode}` : ""}`])
      .sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  }, [employees]);

  const filteredDocuments = useMemo(() => {
    const searchValue = search
      .trim()
      .toLowerCase();

    return documents.filter((document) => {
      const matchesSearch =
        !searchValue ||
        document.name
          ?.toLowerCase()
          .includes(searchValue) ||
        document.originalName
          ?.toLowerCase()
          .includes(searchValue) ||
        document.originalFileName
          ?.toLowerCase()
          .includes(searchValue) ||
        document.fileName
          ?.toLowerCase()
          .includes(searchValue) ||
        document.category
          ?.toLowerCase()
          .includes(searchValue);

      const matchesCategory = filterCategory === "All" || document.category === filterCategory;
      const matchesEmployee = filterEmployee === "All" || document.userId === filterEmployee;

      return matchesSearch && matchesCategory && matchesEmployee;
    });
  }, [
    documents,
    search,
    filterCategory,
    filterEmployee,
  ]);

  const getFileIcon = (document) => {
    const type =
      document?.fileType || "";

    if (type.startsWith("image/")) {
      return FileImage;
    }

    if (type.startsWith("video/")) {
      return FileVideo;
    }

    if (
      type.includes("pdf") ||
      type.includes("text") ||
      type.includes("document") ||
      type.includes("word")
    ) {
      return FileText;
    }

    return File;
  };

  const formatDate = (timestamp) => {
    const date =
      timestamp?.toDate?.() ||
      (timestamp
        ? new Date(timestamp)
        : null);

    if (
      !date ||
      Number.isNaN(date.getTime())
    ) {
      return "Recently";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  /*
  |--------------------------------------------------------------------------
  | CLOUDINARY DOWNLOAD
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | We DO NOT use:
  |
  | /fl_attachment:filename/
  |
  | because spaces/special characters in the filename can create
  | an invalid Cloudinary transformation and return HTTP 400.
  |
  | Instead we fetch the actual file and create a local Blob URL.
  |
  |--------------------------------------------------------------------------
  */

  const handleDownload = async (documentData) => {
  const fileUrl =
    documentData?.fileUrl ||
    documentData?.cloudinaryUrl ||
    "";

  if (!fileUrl) {
    setError(
      "Download URL is not available for this document."
    );
    return;
  }

  try {
    setError("");
    setSuccess("");

    /*
    |--------------------------------------------------------------------------
    | IMPORTANT
    |--------------------------------------------------------------------------
    | Cloudinary URL me fl_attachment transformation nahi lagayenge.
    | Original secure_url ko hi use karenge.
    */

    const response = await fetch(fileUrl, {
      method: "GET",
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error(
        `Unable to download file. Server returned ${response.status}.`
      );
    }

    const blob = await response.blob();

    if (!blob || blob.size === 0) {
      throw new Error(
        "Downloaded file is empty."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE LOCAL BLOB URL
    |--------------------------------------------------------------------------
    */

    const blobUrl =
      window.URL.createObjectURL(blob);

    /*
    |--------------------------------------------------------------------------
    | FILE NAME
    |--------------------------------------------------------------------------
    */

    const fileName =
      documentData?.originalName ||
      documentData?.originalFileName ||
      documentData?.fileName ||
      documentData?.cloudinaryOriginalFilename ||
      documentData?.name ||
      "document";

    /*
    |--------------------------------------------------------------------------
    | DOWNLOAD
    |--------------------------------------------------------------------------
    */

    const anchor =
      window.document.createElement("a");

    anchor.href = blobUrl;
    anchor.download = fileName;
    anchor.style.display = "none";

    window.document.body.appendChild(anchor);

    anchor.click();

    window.document.body.removeChild(anchor);

    /*
    |--------------------------------------------------------------------------
    | CLEANUP
    |--------------------------------------------------------------------------
    */

    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 1000);

    setSuccess(
      "Document downloaded successfully."
    );
  } catch (error) {
    console.error(
      "Document download error:",
      error
    );

    /*
    |--------------------------------------------------------------------------
    | FALLBACK
    |--------------------------------------------------------------------------
    | Agar browser CORS ki wajah se fetch block karta hai,
    | original Cloudinary URL new tab me open hoga.
    */

    try {
      const fallback =
        window.document.createElement("a");

      fallback.href = fileUrl;
      fallback.target = "_blank";
      fallback.rel =
        "noopener noreferrer";

      window.document.body.appendChild(
        fallback
      );

      fallback.click();

      window.document.body.removeChild(
        fallback
      );

      setError(
        "Direct download was blocked by the browser, so the document was opened in a new tab."
      );
    } catch (fallbackError) {
      console.error(
        "Download fallback error:",
        fallbackError
      );

      setError(
        error?.message ||
          "Unable to download document."
      );
    }
  }
};

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Secure storage
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Documents
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Upload, manage and securely access your documents.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Documents
          </p>

          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
            {documents.length}
          </p>
        </div>

      </div>

      {/* ERROR */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30">

          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
          />

          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            className="ml-auto text-red-500"
          >
            <X size={17} />
          </button>

        </div>
      )}

      {/* SUCCESS */}

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">

          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            {success}
          </p>

          <button
            type="button"
            onClick={() =>
              setSuccess("")
            }
            className="ml-auto text-emerald-500"
          >
            <X size={17} />
          </button>

        </div>
      )}

      {/* UPLOAD */}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <div className="mb-5">
          <h2 className="font-bold text-slate-900 dark:text-white">
            Upload Document
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Maximum file size: 10 MB
          </p>
        </div>

        <form
          onSubmit={handleUpload}
          className="space-y-5"
        >

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
          />

          {!selectedFile ? (
            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="flex min-h-36 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 text-center transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-slate-600"
            >

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                <Upload size={22} />
              </div>

              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Choose a file to upload
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                PDF, images, documents and other supported files
              </p>

            </button>
          ) : (
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                <File size={20} />
              </div>

              <div className="min-w-0 flex-1">

                <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                  {selectedFile.name}
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {formatFileSize(
                    selectedFile.size
                  )}
                </p>

              </div>

              <button
                type="button"
                onClick={
                  handleRemoveSelectedFile
                }
                className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-red-600 dark:hover:bg-slate-700"
              >
                <X size={18} />
              </button>

            </div>
          )}

          {/* NAME */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Document Name
            </label>

            <input
              type="text"
              value={documentName}
              onChange={(event) =>
                setDocumentName(
                  event.target.value
                )
              }
              placeholder="Enter document name"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* CATEGORY */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Category
            </label>

            <select
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {categories
                .filter(
                  (item) =>
                    item !== "All"
                )
                .map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
            </select>
          </div>

          {/* DESCRIPTION */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Description
            </label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              rows={4}
              placeholder="Optional description..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* UPLOAD */}

          <button
            type="submit"
            disabled={
              uploading ||
              !selectedFile
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
          >

            {uploading ? (
              <>
                <Loader2
                  size={17}
                  className="animate-spin"
                />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={17} />
                Upload Document
              </>
            )}

          </button>

        </form>
      </section>

      {/* DOCUMENT LIST */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <div className="border-b border-slate-200 p-5 dark:border-slate-800">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">
                My Documents
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {filteredDocuments.length} document
                {filteredDocuments.length === 1
                  ? ""
                  : "s"}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">

              <div className="relative">

                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search documents..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 outline-none sm:w-56 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />

              </div>

              <select
                value={filterCategory}
                onChange={(event) =>
                  setFilterCategory(
                    event.target.value
                  )
                }
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >

                {categories.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}

              </select>

              {isManagement && (
                <select value={filterEmployee} onChange={(event) => setFilterEmployee(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <option value="All">All Employees</option>
                  {documentEmployees.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              )}

            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-52 items-center justify-center">

            <div className="text-center">

              <Loader2
                size={28}
                className="mx-auto animate-spin text-slate-400"
              />

              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Loading documents...
              </p>

            </div>

          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex min-h-52 items-center justify-center p-6">

            <div className="text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <File size={25} />
              </div>

              <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-white">
                No documents found
              </h3>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Upload a document or change your search/filter.
              </p>

            </div>

          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">

            {filteredDocuments.map(
              (document) => {

                const Icon =
                  getFileIcon(document);

                const fileUrl =
                  document.fileUrl ||
                  document.cloudinaryUrl ||
                  document.url ||
                  "";

                return (
                  <div
                    key={document.id}
                    className="group flex flex-col gap-4 p-5 transition hover:bg-slate-50 md:flex-row md:items-center dark:hover:bg-slate-800/40"
                  >

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <Icon size={21} />
                    </div>

                    <div className="min-w-0 flex-1">

                      <div className="flex flex-wrap items-center gap-2">

                        <h3 className="truncate text-sm font-bold text-slate-800 dark:text-white">
                          {document.name ||
                            document.originalName ||
                            document.originalFileName ||
                            "Untitled Document"}
                        </h3>

                        {document.category && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {document.category}
                          </span>
                        )}

                      </div>

                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                        {document.originalName ||
                          document.originalFileName ||
                          document.fileName ||
                          document.name ||
                          "Document"}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">

                        <span>
                          {formatFileSize(
                            document.size ||
                              document.fileSize ||
                              document.bytes ||
                              document.cloudinaryBytes ||
                              0
                          )}
                        </span>

                        <span>
                          {formatDate(
                            document.createdAt
                          )}
                        </span>

                      </div>

                      {document.description && (
                        <p className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                          {document.description}
                        </p>
                      )}

                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">

                      {fileUrl && (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                          <ExternalLink size={14} />
                          Open
                        </a>
                      )}

                      {fileUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDownload(
                              document
                            )
                          }
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                        >
                          <Download size={14} />
                          Download
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            document
                          )
                        }
                        disabled={
                          deletingId ===
                          document.id
                        }
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-red-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                      >

                        {deletingId ===
                        document.id ? (
                          <Loader2
                            size={14}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2
                            size={14}
                          />
                        )}

                        Delete
                      </button>

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      </section>
    </div>
  );
}

export default Documents;

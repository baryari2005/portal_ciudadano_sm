export class CatalogConflictError extends Error {
  status = 409;

  constructor(message: string) {
    super(message);
    this.name = "CatalogConflictError";
  }
}

export class CatalogNotFoundError extends Error {
  status = 404;

  constructor(message = "Registro no encontrado") {
    super(message);
    this.name = "CatalogNotFoundError";
  }
}

export class CatalogValidationError extends Error {
  status = 400;

  constructor(message: string) {
    super(message);
    this.name = "CatalogValidationError";
  }
}

class Error(Exception):
    def __init__(self, message: str = "", original: Exception | None = None):
        super().__init__(message)
        self.message = message
        self.original = original
        
    def __str__(self):
        class_name = type(self).__name__
    
        if not self.message and self.original:
            return f"{class_name} occurred as: {self.original}"
        elif not self.message and not self.original:
            return f"{class_name} occurred."
        return f"{class_name}: {self.message}"

class BackendError(Error):
    pass

class ProcessingError(Error):
    pass

class APIError(Error):
    pass
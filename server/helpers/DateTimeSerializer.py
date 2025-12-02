from datetime import datetime

class DateTimeSerializerVisitor:
    """Visitor to convert datetime in nested structures to ISO strings."""
    def visit(self, obj):
        if isinstance(obj, dict):
            result = {}
            for key, value in obj.items():
                result[key] = self.visit(value)
            return result
        elif isinstance(obj, list):
            return [self.visit(item) for item in obj]
        elif isinstance(obj, datetime):
            return obj.isoformat()
        return obj
import Ajv, { JSONSchemaType } from 'ajv';

// Create an Ajv instance
const ajv = new Ajv();

export interface PaymentMethod {
    type: string;
    size: string;
    format: string;
}

export interface BuyerJourneyPage {
    name: string;
    page_type: string;
    page_type_reason: string;
    payment_methods: PaymentMethod[];
}

export const BRANDI_JSON_SCHEMA: JSONSchemaType<BuyerJourneyPage> = {
    //    "$schema": "http://json-schema.org/draft-04/schema#",
    "type": "object",
    "properties": {
        "name": {
            "type": "string"
        },
        "page_type": {
            "type": "string",
            "enum": ["cart", "checkout", "mini-cart", "product_details", "product_list", "unknown"]
        },
        "page_type_reason": {
            "type": "string"
        },
        "payment_methods": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string"
                    },
                    "size": {
                        "type": "string"
                    },
                    "format": {
                        "type": "string"
                    }
                },
                "required": [
                    "type",
                    "size",
                    "format"
                ]
            }
        }
    },
    "required": [
        "name",
        "page_type",
        "page_type_reason",
        "payment_methods"
    ]
};

// Compile the schema
export const validate = ajv.compile(BRANDI_JSON_SCHEMA);
export function validateBrandiJsonSchema(value: string | any): boolean {
    if (typeof value === 'string') {
        try {
            value = JSON.parse(value)
        } catch {
            return false;
        }
    }
    return validate(value);
}
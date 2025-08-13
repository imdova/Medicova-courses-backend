import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function IsPhoneNumberValid(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isPhoneNumberValid',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: string, args: ValidationArguments) {
          const phoneNumber = parsePhoneNumberFromString(value);

          // Basic structure check using libphonenumber-js
          if (!phoneNumber?.isValid()) {
            return false;
          }

          // Additional rule for Egyptian numbers: must start with 010, 011, or 012
          if (phoneNumber.country === 'EG') {
            const nationalNumber = phoneNumber.nationalNumber; // e.g. "1012345678"
            return /^(10|11|12||15)[0-9]{8}$/.test(nationalNumber);
          }

          // Accept numbers from other countries if valid
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return 'invalid phoneNumber';
        },
      },
    });
  };
}

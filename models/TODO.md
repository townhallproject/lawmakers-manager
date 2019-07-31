## Todos

1. Do a bit of cleanup and merge `Moc` and `StateLawmaker` objects into single `OfficePerson` object that has multiple
`unpackFrom{x}` functions, where `x` is the database the object data was retrieved from.
2. Finish the other models, `Role` and `Committee`. `Committee` look's really empty right now but can easily be added to
with the cleanup of `Moc` / ProPublica rewrite.
3. Figure out a method to map up current `OfficePerson` details with the details stored in the database `office_people`
collection. If the `OfficePerson` is already stored, we simply want to update the current info or add the new `Role`
information.
4. It would probably be good to have a function that is simply `getStateAbbreviation` given the state name or the
inverse, `getStateName` given the state abbreviation so that the individual data modals can pull it in instead of
continually passing down information from `OfficePerson` -> `Role` -> `Committee`.
5. `Role` should be changed to `Office` so that it can be reused for `Campaign`.
```
person:
    roles: Office[]
    campaign: Office[]
```

## Comments
1. `OfficePerson` top level object data can really be thought of as the current `Role` / `Campaign` plus some personal
information.
2. `OfficePerson` will always have a list / array of at least one `Role`.
3. `Role` may or may not have a list of `Committee`. Best guess is it will likely depend on what API we are hitting,
but. At least for ProPublica and Open States, we do get some `Committee` information.
4. One thing that makes a `Campaign` differ from a `Role`, is that it has a `status`, which can be either `lost`,
`active_primary_candidate` or `active_general_candidate`, `won`.

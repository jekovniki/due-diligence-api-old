import Cache from "./cache";
import FetchAPI from "../libs/fetch";
import { Category, Institution, Person, StructuredPEPData } from "../interfaces/pep";
import { SOURCE } from "../utils/configuration";
import { COMMISSION_AGAINST_CORRUPTION_DATA_PER_YEAR } from "../utils/constants/enums";

export async function getPEPList(): Promise<{ success: boolean, data: StructuredPEPData[] } | { success: boolean, message: string }> {
    try {
        const cache = Cache.getInstance();
        const pepList = cache.get('pep_list');
        if (!pepList) {
            const pepList = await getAllTimePEPListFromCommissionAgainstCorruption();
            cache.set('pep_list', JSON.stringify(pepList));
            
            return {
                success: true,
                data: pepList
            }
        }

        return {
            success: true,
            data: JSON.parse(pepList)
        }
    } catch (error) {
        console.error(error);

        return {
            success: false,
            message: error instanceof Error ? error.message : JSON.stringify(error)
        }
    }
}

async function getAllTimePEPListFromCommissionAgainstCorruption(): Promise<StructuredPEPData[]> {
    const pepListPerYear: Array<Person[]> = [];
    let index = 2013; // From this year there are records in the commission database
    for (const year of COMMISSION_AGAINST_CORRUPTION_DATA_PER_YEAR) {
        const fetchedData = await getPEPListFromCommissionAgainstCorruption(SOURCE + year);
        pepListPerYear.push(convertPEPListFromCommissionAgainstCorruptionToJSON(fetchedData, index.toString()));

        index++;
    }

    const formattedArray = formatPEPListFromCommissionAgainstCorruptionPerPerson(pepListPerYear.flat())

    return formattedArray;
}

function formatPEPListFromCommissionAgainstCorruptionPerPerson(pepList: Person[]): StructuredPEPData[] {
    const outputArray: StructuredPEPData[] = [];
    const nameMap: { [name: string]: StructuredPEPData } = {};
  
    pepList.forEach(obj => {
      const { name, position, category, institution, year } = obj;
  
      if (!nameMap[name]) {
        nameMap[name] = {
          name: name,
          history: []
        };
        outputArray.push(nameMap[name]);
      }
  
      nameMap[name].history.push({
        year: year,
        position: position,
        category: category,
        institution: institution
      });
    });
  
    return outputArray;
  
}

async function getPEPListFromCommissionAgainstCorruption(url: string):Promise<string> {
    const request = await FetchAPI.get(url);

    return request.data;
}

function convertPEPListFromCommissionAgainstCorruptionToJSON(data: string, year: string): Person[] {
    const categories: Person[] = [];

    const allCategories = data.split('</Category>');

    // Initialize variables to store the current category, institution, person, and position
    let currentCategory: Category | undefined;
    let currentInstitution: Institution | undefined;
    let currentPerson: Person | undefined;

    for (const line of allCategories) {
        const categoryName = line.match(/<Category Name="(.*?)"><Institution/)?.[1];
        if(categoryName) {
            currentCategory = { name: categoryName, institution: [] }
        }
        const allInstitutions = line.split('</Institution>');
        for (const institutionLine of allInstitutions) {
            const institutionName = institutionLine.match(/<Institution Name="(.*?)" Show="False">/)?.[1];
            if (currentCategory && institutionName) {
                currentInstitution = { name: institutionName, person: [] }
                currentCategory.institution.push(currentInstitution);
            }

            const allPeople = institutionLine.split('</Position></Person>');

            for (const peopleLine of allPeople) {
                const personName = peopleLine.match(/<Person><Name>(.*?)<\/Name><Position>/)?.[1];
                const positionName = peopleLine.match(/<\/Name><Position><Name>(.*?)<\/Name>/)?.[1];
                if (currentInstitution && personName && positionName) {
                    currentPerson = { 
                        name: personName, 
                        position: positionName,
                        category: categoryName as string,
                        institution: institutionName as string,
                        year: year
                    };
                    categories.push(currentPerson);
                }
            }
        }
    }

    return categories as Person[];
}